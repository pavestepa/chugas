import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "@/db/client";

const MIGRATION_NAME = "friends-to-follows-v1";

interface MigrationStats {
  friendshipsMigrated: number;
  followRequestsMigrated: number;
  postsTypeUpdated: number;
  postsVisibilityUpdated: number;
  usersInitialized: number;
  usersCountersRecalculated: number;
  legacyCollectionsDropped: string[];
}

function parseArgs(argv: string[]) {
  return {
    force: argv.includes("--force"),
    keepLegacy: argv.includes("--keep-legacy"),
  };
}

async function collectionExists(db: mongoose.mongo.Db, name: string) {
  const collections = await db.listCollections({ name }).toArray();
  return collections.length > 0;
}

async function migrateFriendships(db: mongoose.mongo.Db) {
  if (!(await collectionExists(db, "friendships"))) {
    return 0;
  }

  const friendships = await db.collection("friendships").find({}).toArray();
  const follows = db.collection("follows");
  let migrated = 0;

  for (const friendship of friendships) {
    const userA = friendship.userA;
    const userB = friendship.userB;
    if (!userA || !userB) {
      continue;
    }

    const createdAt = friendship.createdAt ?? new Date();
    const pairs = [
      { followerId: userA, followingId: userB },
      { followerId: userB, followingId: userA },
    ];

    for (const pair of pairs) {
      const result = await follows.updateOne(
        {
          followerId: pair.followerId,
          followingId: pair.followingId,
        },
        {
          $setOnInsert: {
            followerId: pair.followerId,
            followingId: pair.followingId,
            createdAt,
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        migrated += 1;
      }
    }
  }

  return migrated;
}

async function migrateFriendRequests(db: mongoose.mongo.Db) {
  if (!(await collectionExists(db, "friend_requests"))) {
    return 0;
  }

  const requests = await db.collection("friend_requests").find({}).toArray();
  const followRequests = db.collection("follow_requests");
  let migrated = 0;

  for (const request of requests) {
    const followerId = request.fromUserId;
    const followingId = request.toUserId;
    const status = request.status;

    if (!followerId || !followingId || !status) {
      continue;
    }

    const existing = await followRequests.findOne({
      followerId,
      followingId,
      status,
    });

    if (existing) {
      continue;
    }

    await followRequests.insertOne({
      followerId,
      followingId,
      status,
      createdAt: request.createdAt ?? new Date(),
    });
    migrated += 1;
  }

  return migrated;
}

async function initializeUsers(db: mongoose.mongo.Db) {
  const users = db.collection("users");
  const [accountTypeResult, followersResult, followingResult] =
    await Promise.all([
      users.updateMany(
        { accountType: { $exists: false } },
        { $set: { accountType: "open" } }
      ),
      users.updateMany(
        { followersCount: { $exists: false } },
        { $set: { followersCount: 0 } }
      ),
      users.updateMany(
        { followingCount: { $exists: false } },
        { $set: { followingCount: 0 } }
      ),
    ]);

  return (
    accountTypeResult.modifiedCount +
    followersResult.modifiedCount +
    followingResult.modifiedCount
  );
}

async function recalculateFollowCounters(db: mongoose.mongo.Db) {
  const follows = db.collection("follows");
  const users = db.collection("users");

  const [followerCounts, followingCounts] = await Promise.all([
    follows
      .aggregate<{
        _id: ObjectId;
        count: number;
      }>([{ $group: { _id: "$followingId", count: { $sum: 1 } } }])
      .toArray(),
    follows
      .aggregate<{
        _id: ObjectId;
        count: number;
      }>([{ $group: { _id: "$followerId", count: { $sum: 1 } } }])
      .toArray(),
  ]);

  await users.updateMany(
    {},
    { $set: { followersCount: 0, followingCount: 0 } }
  );

  for (const entry of followerCounts) {
    await users.updateOne(
      { _id: entry._id },
      { $set: { followersCount: entry.count } }
    );
  }

  for (const entry of followingCounts) {
    await users.updateOne(
      { _id: entry._id },
      { $set: { followingCount: entry.count } }
    );
  }

  return followerCounts.length + followingCounts.length;
}

async function migratePosts(db: mongoose.mongo.Db) {
  const posts = db.collection("posts");

  const [typeResult, visibilityResult] = await Promise.all([
    posts.updateMany({ type: "friend" }, { $set: { type: "followers" } }),
    posts.updateMany(
      { visibility: "friends" },
      { $set: { visibility: "followers" } }
    ),
  ]);

  return {
    typeUpdated: typeResult.modifiedCount,
    visibilityUpdated: visibilityResult.modifiedCount,
  };
}

async function dropLegacyCollections(
  db: mongoose.mongo.Db,
  keepLegacy: boolean
): Promise<string[]> {
  if (keepLegacy) {
    return [];
  }

  const dropped: string[] = [];
  for (const name of ["friendships", "friend_requests"]) {
    if (await collectionExists(db, name)) {
      await db.collection(name).drop();
      dropped.push(name);
    }
  }

  return dropped;
}

async function main() {
  const { force, keepLegacy } = parseArgs(process.argv.slice(2));
  await connectDb();

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection is not ready");
  }

  const migrations = db.collection("migrations");
  const existing = await migrations.findOne({ name: MIGRATION_NAME });

  if (existing && !force) {
    console.log(
      `Migration "${MIGRATION_NAME}" already applied at ${existing.ranAt.toISOString()}. Use --force to run again.`
    );
    await disconnectDb();
    return;
  }

  console.log(`Running migration "${MIGRATION_NAME}"...`);

  const usersInitialized = await initializeUsers(db);
  const friendshipsMigrated = await migrateFriendships(db);
  const followRequestsMigrated = await migrateFriendRequests(db);
  const postUpdates = await migratePosts(db);
  const usersCountersRecalculated = await recalculateFollowCounters(db);
  const legacyCollectionsDropped = await dropLegacyCollections(db, keepLegacy);

  const stats: MigrationStats = {
    friendshipsMigrated,
    followRequestsMigrated,
    postsTypeUpdated: postUpdates.typeUpdated,
    postsVisibilityUpdated: postUpdates.visibilityUpdated,
    usersInitialized,
    usersCountersRecalculated,
    legacyCollectionsDropped,
  };

  await migrations.updateOne(
    { name: MIGRATION_NAME },
    {
      $set: {
        name: MIGRATION_NAME,
        ranAt: new Date(),
        stats,
        force,
        keepLegacy,
      },
    },
    { upsert: true }
  );

  console.log("Migration completed:");
  console.log(JSON.stringify(stats, null, 2));

  await disconnectDb();
}

main().catch(async (error) => {
  console.error("Migration failed:", error);
  await disconnectDb();
  process.exit(1);
});
