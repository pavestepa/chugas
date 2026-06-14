import { isDuplicateKeyError } from "@/lib/errors";
import {
  FollowRequestModel,
  toFollowRequestJson,
} from "@/schemas/follow-request.schema";
import { FollowModel, toFollowJson } from "@/schemas/follow.schema";
import { UserModel } from "@/schemas/user.schema";
import { BlocksService } from "@/services/blocks.service";

async function visibleFollowIds(userId: string, ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const blockedIds = new Set([
    ...(await BlocksService.blockedUserIds(userId)),
    ...(await BlocksService.blockedByUserIds(userId)),
  ]);

  return ids.filter((id) => !blockedIds.has(id));
}

async function createFollow(followerId: string, followingId: string) {
  const follow = await FollowModel.create({ followerId, followingId });
  await Promise.all([
    UserModel.updateOne({ _id: followerId }, { $inc: { followingCount: 1 } }),
    UserModel.updateOne({ _id: followingId }, { $inc: { followersCount: 1 } }),
  ]);

  return toFollowJson(follow);
}

export const FollowsService = {
  follow: async (followerId: string, followingId: string) => {
    if (followerId === followingId) {
      return { error: "self_follow" as const };
    }

    if (await BlocksService.isBlockedBetween(followerId, followingId)) {
      return { error: "blocked" as const };
    }

    const targetUser =
      await UserModel.findById(followingId).select("accountType");
    if (!targetUser) {
      return { error: "not_found" as const };
    }

    const existingFollow = await FollowModel.exists({
      followerId,
      followingId,
    });
    if (existingFollow) {
      return { error: "already_following" as const };
    }

    if (targetUser.accountType === "closed") {
      const existingPendingRequest = await FollowRequestModel.findOne({
        status: "pending",
        $or: [
          { followerId, followingId },
          { followerId: followingId, followingId: followerId },
        ],
      });

      if (existingPendingRequest) {
        return {
          error: "request_exists" as const,
          request: toFollowRequestJson(existingPendingRequest),
        };
      }

      const request = await FollowRequestModel.create({
        followerId,
        followingId,
        status: "pending",
      });

      return { request: toFollowRequestJson(request) };
    }

    try {
      const follow = await createFollow(followerId, followingId);
      return { follow };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return { error: "already_following" as const };
      }
      throw error;
    }
  },

  unfollow: async (followerId: string, followingId: string) => {
    const follow = await FollowModel.findOneAndDelete({
      followerId,
      followingId,
    });

    if (!follow) {
      return false;
    }

    await Promise.all([
      UserModel.updateOne(
        { _id: followerId },
        { $inc: { followingCount: -1 } }
      ),
      UserModel.updateOne(
        { _id: followingId },
        { $inc: { followersCount: -1 } }
      ),
    ]);

    return true;
  },

  cancelRequest: async (followerId: string, followingId: string) => {
    const request = await FollowRequestModel.findOneAndDelete({
      followerId,
      followingId,
      status: "pending",
    });

    return request ? toFollowRequestJson(request) : null;
  },

  incomingRequests: async (userId: string) => {
    const requests = await FollowRequestModel.find({
      followingId: userId,
      status: "pending",
    }).sort({ createdAt: -1 });

    const blockedIds = new Set([
      ...(await BlocksService.blockedUserIds(userId)),
      ...(await BlocksService.blockedByUserIds(userId)),
    ]);

    return requests
      .filter((request) => !blockedIds.has(request.followerId.toString()))
      .map(toFollowRequestJson);
  },

  outgoingRequests: async (userId: string) => {
    const requests = await FollowRequestModel.find({
      followerId: userId,
      status: "pending",
    }).sort({ createdAt: -1 });

    const blockedIds = new Set([
      ...(await BlocksService.blockedUserIds(userId)),
      ...(await BlocksService.blockedByUserIds(userId)),
    ]);

    return requests
      .filter((request) => !blockedIds.has(request.followingId.toString()))
      .map(toFollowRequestJson);
  },

  acceptRequest: async (requestId: string, userId: string) => {
    const request = await FollowRequestModel.findOne({
      _id: requestId,
      followingId: userId,
      status: "pending",
    });

    if (!request) {
      return null;
    }

    if (
      await BlocksService.isBlockedBetween(
        request.followerId.toString(),
        request.followingId.toString()
      )
    ) {
      return { error: "blocked" as const };
    }

    const followerId = request.followerId.toString();
    const followingId = request.followingId.toString();

    let follow;
    try {
      follow = await createFollow(followerId, followingId);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        request.status = "accepted";
        await request.save();
        const existingFollow = await FollowModel.findOne({
          followerId,
          followingId,
        });
        return {
          request: toFollowRequestJson(request),
          follow: existingFollow ? toFollowJson(existingFollow) : null,
        };
      }
      throw error;
    }

    request.status = "accepted";
    await request.save();

    return {
      request: toFollowRequestJson(request),
      follow,
    };
  },

  rejectRequest: async (requestId: string, userId: string) => {
    const request = await FollowRequestModel.findOneAndUpdate(
      {
        _id: requestId,
        followingId: userId,
        status: "pending",
      },
      { status: "rejected" },
      { new: true, runValidators: true }
    );

    return request ? toFollowRequestJson(request) : null;
  },

  followers: async (userId: string) => {
    const follows = await FollowModel.find({ followingId: userId }).sort({
      createdAt: -1,
    });
    const visibleIds = new Set(
      await visibleFollowIds(
        userId,
        follows.map((follow) => follow.followerId.toString())
      )
    );

    return follows
      .filter((follow) => visibleIds.has(follow.followerId.toString()))
      .map(toFollowJson);
  },

  following: async (userId: string) => {
    const follows = await FollowModel.find({ followerId: userId }).sort({
      createdAt: -1,
    });
    const visibleIds = new Set(
      await visibleFollowIds(
        userId,
        follows.map((follow) => follow.followingId.toString())
      )
    );

    return follows
      .filter((follow) => visibleIds.has(follow.followingId.toString()))
      .map(toFollowJson);
  },

  followerIds: async (userId: string) => {
    const follows = await FollowModel.find({ followingId: userId }).select(
      "followerId"
    );
    return visibleFollowIds(
      userId,
      follows.map((follow) => follow.followerId.toString())
    );
  },

  followingIds: async (userId: string) => {
    const follows = await FollowModel.find({ followerId: userId }).select(
      "followingId"
    );
    return visibleFollowIds(
      userId,
      follows.map((follow) => follow.followingId.toString())
    );
  },

  removeBetween: async (userA: string, userB: string) => {
    const follows = await FollowModel.find({
      $or: [
        { followerId: userA, followingId: userB },
        { followerId: userB, followingId: userA },
      ],
    }).select("followerId followingId");

    if (follows.length === 0) {
      return;
    }

    await FollowModel.deleteMany({
      _id: { $in: follows.map((follow) => follow._id) },
    });
    await Promise.all(
      follows.flatMap((follow) => [
        UserModel.updateOne(
          { _id: follow.followerId },
          { $inc: { followingCount: -1 } }
        ),
        UserModel.updateOne(
          { _id: follow.followingId },
          { $inc: { followersCount: -1 } }
        ),
      ])
    );
  },
};
