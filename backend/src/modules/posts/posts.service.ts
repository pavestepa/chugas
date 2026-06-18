import { Injectable } from '@nestjs/common';
import type { Post, Prisma } from '@prisma/client';

import { toPostJson } from '../../common/mappers/api-json.mapper';
import {
  BBox,
  Coordinates,
  distanceMeters,
  normalizeBBox,
  normalizeCoordinates,
  postExpiresAt,
  POST_READ_RADIUS_METERS,
  secondsUntil,
  toGeoPoint,
} from '../../common/utils/geo.util';
import { CascadeService } from '../../common/services/cascade.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BlocksService } from '../blocks/blocks.service';
import { FollowsService } from '../follows/follows.service';
import type {
  MapPoint,
  PostType,
  PostVisibility,
  ReadablePost,
} from './dto/posts.dto';

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
  followingId?: string;
  limit?: number;
  bbox?: BBox;
  center?: Coordinates;
  radiusMeters?: number;
}

interface NearbyPostFilters extends MapPostFilters {
  location: Coordinates;
}

export type FindReadablePostResult =
  | { error: 'not_found' }
  | { error: 'too_far'; point: MapPoint }
  | { error: 'forbidden' }
  | { post: ReadablePost };

type CreatePostResult =
  | ReadablePost
  | { error: 'community_required' }
  | { error: 'forbidden' };

function bboxFromCenter(center: Coordinates, radiusMeters: number): BBox {
  const latDelta = radiusMeters / 111_320;
  const lngDelta =
    radiusMeters / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  return {
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
  };
}

function mapPoint(post: Post): MapPoint {
  return {
    postId: post.id,
    type: post.type as PostType,
    visibility: post.visibility as PostVisibility,
    authorId: post.authorId,
    expiresAt: post.expiresAt,
    secondsLeft: secondsUntil(post.expiresAt),
    ...(post.communityId ? { communityId: post.communityId } : {}),
    location: toGeoPoint(post.longitude, post.latitude),
  };
}

function readablePost(post: Post): ReadablePost {
  return toPostJson(post) as ReadablePost;
}

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followsService: FollowsService,
    private readonly blocksService: BlocksService,
    private readonly cascadeService: CascadeService,
  ) {}

  private bboxWhere(bbox: BBox) {
    const normalized = normalizeBBox(bbox);
    return {
      longitude: { gte: normalized.minLng, lte: normalized.maxLng },
      latitude: { gte: normalized.minLat, lte: normalized.maxLat },
    };
  }

  private filterByDistance(posts: Post[], center: Coordinates, maxMeters: number) {
    const c = normalizeCoordinates(center);
    return posts.filter(
      (post) =>
        distanceMeters(c, { lng: post.longitude, lat: post.latitude }) <= maxMeters,
    );
  }

  private async canAccessPost(post: Post, userId: string): Promise<boolean> {
    if (post.visibility === 'public') {
      return !(await this.blocksService.isBlockedBetween(post.authorId, userId));
    }

    if (post.visibility === 'followers') {
      if (post.authorId === userId) {
        return true;
      }

      const followingIds = await this.followsService.followingIds(userId);
      return (
        followingIds.includes(post.authorId) &&
        !(await this.blocksService.isBlockedBetween(post.authorId, userId))
      );
    }

    if (!post.communityId) {
      return false;
    }

    const member = await this.prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId: post.communityId,
          userId,
        },
      },
    });
    return Boolean(member);
  }

  async findReadableById(
    id: string,
    userId: string,
    location: Coordinates,
  ): Promise<FindReadablePostResult> {
    const post = await this.prisma.post.findFirst({
      where: { id, expiresAt: { gt: new Date() } },
    });
    if (!post) {
      return { error: 'not_found' };
    }

    const coordinates = { lng: post.longitude, lat: post.latitude };
    if (
      distanceMeters(normalizeCoordinates(location), coordinates) >
      POST_READ_RADIUS_METERS
    ) {
      return { error: 'too_far', point: mapPoint(post) };
    }

    if (!(await this.canAccessPost(post, userId))) {
      return { error: 'forbidden' };
    }

    return { post: readablePost(post) };
  }

  async create(input: CreatePostInput): Promise<CreatePostResult> {
    const location = normalizeCoordinates(input.location);
    const visibility =
      input.type === 'followers'
        ? 'followers'
        : input.type === 'community'
          ? 'community'
          : 'public';

    if (input.type === 'community') {
      if (!input.communityId) {
        return { error: 'community_required' };
      }

      const ban = await this.prisma.communityBan.findUnique({
        where: {
          communityId_userId: {
            communityId: input.communityId,
            userId: input.authorId,
          },
        },
      });
      if (ban) {
        return { error: 'forbidden' };
      }

      const member = await this.prisma.communityMember.findUnique({
        where: {
          communityId_userId: {
            communityId: input.communityId,
            userId: input.authorId,
          },
        },
      });
      if (!member) {
        return { error: 'forbidden' };
      }
    }

    const post = await this.prisma.post.create({
      data: {
        authorId: input.authorId,
        type: input.type,
        visibility,
        text: input.text,
        media: input.media ?? [],
        communityId: input.communityId,
        longitude: location.lng,
        latitude: location.lat,
        expiresAt: postExpiresAt(),
      },
    });

    return readablePost(post);
  }

  async delete(id: string, authorId: string): Promise<boolean> {
    const post = await this.prisma.post.findFirst({
      where: { id, authorId },
      select: { id: true },
    });
    if (!post) {
      return false;
    }
    return this.cascadeService.deletePost(id);
  }

  async feed(userId: string): Promise<ReadablePost[]> {
    const authorIds = [userId, ...(await this.followsService.followingIds(userId))];
    const blockedIds = [
      ...(await this.blocksService.blockedUserIds(userId)),
      ...(await this.blocksService.blockedByUserIds(userId)),
    ];

    const posts = await this.prisma.post.findMany({
      where: {
        authorId:
          blockedIds.length > 0
            ? { in: authorIds, notIn: blockedIds }
            : { in: authorIds },
        visibility: { in: ['public', 'followers'] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return posts.map(readablePost);
  }

  async mapPoints(filters: MapPostFilters) {
    const now = new Date();
    let geoWhere: Record<string, unknown> | null = null;
    let centerFilter: Coordinates | null = null;
    let radiusFilter: number | null = null;

    if (filters.bbox !== undefined) {
      geoWhere = this.bboxWhere(filters.bbox);
    } else if (filters.center !== undefined) {
      centerFilter = normalizeCoordinates(filters.center);
      radiusFilter = filters.radiusMeters ?? 10_000;
      geoWhere = this.bboxWhere(bboxFromCenter(centerFilter, radiusFilter));
    } else {
      return { error: 'viewport_required' as const };
    }

    const where: Prisma.PostWhereInput = {
      expiresAt: { gt: now },
      ...geoWhere,
    };

    if (filters.type !== undefined) {
      where.type = filters.type;
    }

    if (filters.communityId !== undefined) {
      where.communityId = filters.communityId;
    }

    if (filters.followingId !== undefined) {
      if (
        await this.blocksService.isBlockedBetween(
          filters.userId,
          filters.followingId,
        )
      ) {
        return { points: [] };
      }
      where.authorId = filters.followingId;
    }

    const blockedIds = [
      ...(await this.blocksService.blockedUserIds(filters.userId)),
      ...(await this.blocksService.blockedByUserIds(filters.userId)),
    ];
    if (blockedIds.length > 0 && filters.followingId === undefined) {
      where.authorId = { notIn: blockedIds };
    }

    let posts = await this.prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters.limit ?? 200, 500),
    });

    if (centerFilter && radiusFilter) {
      posts = this.filterByDistance(posts, centerFilter, radiusFilter);
    }

    const visible = await Promise.all(
      posts.map(async (post) =>
        (await this.canAccessPost(post, filters.userId)) ? mapPoint(post) : null,
      ),
    );

    return { points: visible.filter((post) => post !== null) };
  }

  async nearbyReadable(filters: NearbyPostFilters) {
    const location = normalizeCoordinates(filters.location);
    const bbox = bboxFromCenter(location, POST_READ_RADIUS_METERS);

    const where: Prisma.PostWhereInput = {
      expiresAt: { gt: new Date() },
      ...this.bboxWhere(bbox),
    };

    if (filters.type !== undefined) {
      where.type = filters.type;
    }

    if (filters.communityId !== undefined) {
      where.communityId = filters.communityId;
    }

    if (filters.followingId !== undefined) {
      if (
        await this.blocksService.isBlockedBetween(
          filters.userId,
          filters.followingId,
        )
      ) {
        return { posts: [] };
      }
      where.authorId = filters.followingId;
    }

    const blockedIds = [
      ...(await this.blocksService.blockedUserIds(filters.userId)),
      ...(await this.blocksService.blockedByUserIds(filters.userId)),
    ];
    if (blockedIds.length > 0 && filters.followingId === undefined) {
      where.authorId = { notIn: blockedIds };
    }

    let posts = await this.prisma.post.findMany({
      where,
      take: Math.min(filters.limit ?? 100, 200),
    });

    posts = this.filterByDistance(posts, location, POST_READ_RADIUS_METERS);

    const visible = await Promise.all(
      posts.map(async (post) =>
        (await this.canAccessPost(post, filters.userId))
          ? readablePost(post)
          : null,
      ),
    );

    return { posts: visible.filter((post) => post !== null) };
  }

  async communityPosts(communityId: string, userId: string, location: Coordinates) {
    const result = await this.nearbyReadable({
      userId,
      communityId,
      location,
      type: 'community',
    });
    return result.posts;
  }

  async communityMapPoints(communityId: string, userId: string): Promise<MapPoint[]> {
    const posts = await this.prisma.post.findMany({
      where: { communityId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const visible = await Promise.all(
      posts.map(async (post) =>
        (await this.canAccessPost(post, userId)) ? mapPoint(post) : null,
      ),
    );

    return visible.filter((post) => post !== null);
  }
}
