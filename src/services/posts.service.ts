import { FriendsService } from "@/services/friends.service";
import {
  type BBox,
  distanceMeters,
  normalizeCoordinates,
  normalizeBBox,
  postExpiresAt,
  POST_READ_RADIUS_METERS,
  secondsUntil,
  type Coordinates,
} from "@/lib/geo";
import type {
  GeoPointDto,
  MapPoint,
  PostType,
  PostVisibility,
  ReadablePost,
} from "@/dto/posts.dto";
import { CommunityMemberModel } from "@/schemas/community-member.schema";
import { CommunityBanModel } from "@/schemas/community-ban.schema";
import { PostModel, toPostJson } from "@/schemas/post.schema";
import { BlocksService } from "@/services/blocks.service";
import { CascadeService } from "@/services/cascade.service";

interface ObjectIdLike {
  toString: () => string;
}

interface PostRecord {
  _id: ObjectIdLike;
  authorId: ObjectIdLike;
  communityId?: ObjectIdLike | null;
  type: PostType;
  visibility: PostVisibility;
  location?: GeoPointDto | null;
  expiresAt: Date;
  createdAt?: Date;
  text?: string;
  media?: string[];
}

interface CreatePostInput {
  authorId: string;
  type: PostType;
  text: string;
  media?: string[];
  communityId?: string;
  location: Coordinates;
}

interface MapPostFilters {
  userId: string;
  type?: PostType;
  communityId?: string;
  friendId?: string;
  limit?: number;
  bbox?: BBox;
  center?: Coordinates;
  radiusMeters?: number;
}

interface NearbyPostFilters extends MapPostFilters {
  location: Coordinates;
}

export type FindReadablePostResult =
  | { error: "not_found" }
  | { error: "too_far"; point: MapPoint }
  | { error: "forbidden" }
  | { post: ReadablePost };

type CreatePostResult =
  | ReadablePost
  | { error: "community_required" }
  | { error: "forbidden" };

type MapPointsResult = { points: MapPoint[] } | { error: "viewport_required" };

interface NearbyReadableResult {
  posts: ReadablePost[];
}

interface PostsServiceContract {
  create: (input: CreatePostInput) => Promise<CreatePostResult>;
  findReadableById: (
    id: string,
    userId: string,
    location: Coordinates
  ) => Promise<FindReadablePostResult>;
  delete: (id: string, authorId: string) => Promise<boolean>;
  feed: (userId: string) => Promise<ReadablePost[]>;
  canAccess: (post: PostRecord, userId: string) => Promise<boolean>;
  mapPoints: (filters: MapPostFilters) => Promise<MapPointsResult>;
  nearbyReadable: (filters: NearbyPostFilters) => Promise<NearbyReadableResult>;
  communityPosts: (
    communityId: string,
    userId: string,
    location: Coordinates
  ) => Promise<ReadablePost[]>;
  communityMapPoints: (
    communityId: string,
    userId: string
  ) => Promise<MapPoint[]>;
}

function pointQuery(location: Coordinates, maxDistanceMeters?: number) {
  return {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [location.lng, location.lat],
      },
      ...(maxDistanceMeters !== undefined
        ? { $maxDistance: maxDistanceMeters }
        : {}),
    },
  };
}

function bboxQuery(bbox: BBox) {
  const normalized = normalizeBBox(bbox);
  return {
    $geoWithin: {
      $box: [
        [normalized.minLng, normalized.minLat],
        [normalized.maxLng, normalized.maxLat],
      ],
    },
  };
}

function asPostRecord(post: unknown): PostRecord {
  return post as PostRecord;
}

function postCoordinates(post: PostRecord): Coordinates | null {
  const lng = post.location?.coordinates[0];
  const lat = post.location?.coordinates[1];
  if (lng === undefined || lat === undefined) {
    return null;
  }

  return { lng, lat };
}

function mapPoint(post: PostRecord): MapPoint {
  return {
    postId: post._id.toString(),
    type: post.type,
    visibility: post.visibility,
    authorId: post.authorId.toString(),
    expiresAt: post.expiresAt,
    secondsLeft: secondsUntil(post.expiresAt),
    ...(post.communityId ? { communityId: post.communityId.toString() } : {}),
    ...(post.location ? { location: post.location } : {}),
  };
}

function readablePost(post: ReturnType<typeof toPostJson>): ReadablePost {
  return post;
}

async function canAccessPost(
  post: PostRecord,
  userId: string
): Promise<boolean> {
  if (post.visibility === "public") {
    return !(await BlocksService.isBlockedBetween(
      post.authorId.toString(),
      userId
    ));
  }

  if (post.visibility === "friends") {
    if (post.authorId.toString() === userId) {
      return true;
    }

    const friendIds = await FriendsService.friendIds(userId);
    return (
      friendIds.includes(post.authorId.toString()) &&
      !(await BlocksService.isBlockedBetween(post.authorId.toString(), userId))
    );
  }

  if (!post.communityId) {
    return false;
  }

  return Boolean(
    await CommunityMemberModel.exists({
      communityId: post.communityId.toString(),
      userId,
    })
  );
}

export async function findReadablePostById(
  id: string,
  userId: string,
  location: Coordinates
): Promise<FindReadablePostResult> {
  const post = await PostModel.findOne({
    _id: id,
    expiresAt: { $gt: new Date() },
  });
  if (!post) {
    return { error: "not_found" };
  }

  const postRecord = asPostRecord(post);
  const coordinates = postCoordinates(postRecord);
  if (
    !coordinates ||
    distanceMeters(normalizeCoordinates(location), coordinates) >
      POST_READ_RADIUS_METERS
  ) {
    return { error: "too_far", point: mapPoint(postRecord) };
  }

  if (!(await canAccessPost(postRecord, userId))) {
    return { error: "forbidden" };
  }

  return { post: readablePost(toPostJson(post)) };
}

export const PostsService: PostsServiceContract = {
  create: async (input: CreatePostInput) => {
    const location = normalizeCoordinates(input.location);
    const visibility =
      input.type === "friend"
        ? "friends"
        : input.type === "community"
          ? "community"
          : "public";

    if (input.type === "community") {
      if (!input.communityId) {
        return { error: "community_required" as const };
      }

      const ban = await CommunityBanModel.exists({
        communityId: input.communityId,
        userId: input.authorId,
      });
      if (ban) {
        return { error: "forbidden" as const };
      }

      const member = await CommunityMemberModel.exists({
        communityId: input.communityId,
        userId: input.authorId,
      });
      if (!member) {
        return { error: "forbidden" as const };
      }
    }

    const post = await PostModel.create({
      authorId: input.authorId,
      type: input.type,
      visibility,
      text: input.text,
      media: input.media ?? [],
      ...(input.communityId !== undefined
        ? { communityId: input.communityId }
        : {}),
      location: {
        type: "Point",
        coordinates: [location.lng, location.lat],
      },
      expiresAt: postExpiresAt(),
    });

    return toPostJson(post);
  },

  findReadableById: async (id: string, userId: string, location: Coordinates) =>
    findReadablePostById(id, userId, location),

  delete: async (id: string, authorId: string) => {
    const post = await PostModel.findOne({ _id: id, authorId }).select("_id");
    if (!post) {
      return false;
    }
    return CascadeService.deletePost(id);
  },

  feed: async (userId: string) => {
    const authorIds = [userId, ...(await FriendsService.friendIds(userId))];
    const blockedIds = [
      ...(await BlocksService.blockedUserIds(userId)),
      ...(await BlocksService.blockedByUserIds(userId)),
    ];
    const posts = await PostModel.find({
      authorId:
        blockedIds.length > 0
          ? { $in: authorIds, $nin: blockedIds }
          : { $in: authorIds },
      visibility: { $in: ["public", "friends"] },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(50);
    return posts.map((post) => readablePost(toPostJson(post)));
  },

  canAccess: canAccessPost,

  mapPoints: async (filters: MapPostFilters) => {
    const filter: Record<string, unknown> = {
      expiresAt: { $gt: new Date() },
    };

    if (filters.bbox !== undefined) {
      filter.location = bboxQuery(filters.bbox);
    } else if (filters.center !== undefined) {
      filter.location = pointQuery(
        normalizeCoordinates(filters.center),
        filters.radiusMeters ?? 10_000
      );
    } else {
      return { error: "viewport_required" as const };
    }

    if (filters.type !== undefined) {
      filter.type = filters.type;
    }

    if (filters.communityId !== undefined) {
      filter.communityId = filters.communityId;
    }

    if (filters.friendId !== undefined) {
      if (
        await BlocksService.isBlockedBetween(filters.userId, filters.friendId)
      ) {
        return { points: [] };
      }

      filter.authorId = filters.friendId;
    }

    const blockedIds = [
      ...(await BlocksService.blockedUserIds(filters.userId)),
      ...(await BlocksService.blockedByUserIds(filters.userId)),
    ];
    if (blockedIds.length > 0) {
      filter.authorId = filters.friendId ?? { $nin: blockedIds };
    }

    const posts = await PostModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(filters.limit ?? 200, 500));
    const visible = await Promise.all(
      posts.map(async (post) =>
        (await PostsService.canAccess(asPostRecord(post), filters.userId))
          ? mapPoint(asPostRecord(post))
          : null
      )
    );

    return { points: visible.filter((post) => post !== null) };
  },

  nearbyReadable: async (filters: NearbyPostFilters) => {
    const location = normalizeCoordinates(filters.location);
    const filter: Record<string, unknown> = {
      expiresAt: { $gt: new Date() },
      location: pointQuery(location, POST_READ_RADIUS_METERS),
    };

    if (filters.type !== undefined) {
      filter.type = filters.type;
    }

    if (filters.communityId !== undefined) {
      filter.communityId = filters.communityId;
    }

    if (filters.friendId !== undefined) {
      if (
        await BlocksService.isBlockedBetween(filters.userId, filters.friendId)
      ) {
        return { posts: [] };
      }

      filter.authorId = filters.friendId;
    }

    const blockedIds = [
      ...(await BlocksService.blockedUserIds(filters.userId)),
      ...(await BlocksService.blockedByUserIds(filters.userId)),
    ];
    if (blockedIds.length > 0) {
      filter.authorId = filters.friendId ?? { $nin: blockedIds };
    }

    const posts = await PostModel.find(filter).limit(
      Math.min(filters.limit ?? 100, 200)
    );
    const visible = await Promise.all(
      posts.map(async (post) =>
        (await PostsService.canAccess(asPostRecord(post), filters.userId))
          ? readablePost(toPostJson(post))
          : null
      )
    );

    return { posts: visible.filter((post) => post !== null) };
  },

  communityPosts: async (
    communityId: string,
    userId: string,
    location: Coordinates
  ) => {
    const result = await PostsService.nearbyReadable({
      userId,
      communityId,
      location,
      type: "community",
    });
    return "posts" in result ? result.posts : [];
  },

  communityMapPoints: async (communityId: string, userId: string) => {
    const posts = await PostModel.find({
      communityId,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const visible = await Promise.all(
      posts.map(async (post) =>
        (await PostsService.canAccess(asPostRecord(post), userId))
          ? mapPoint(asPostRecord(post))
          : null
      )
    );

    return visible.filter((post) => post !== null);
  },
};
