import { Injectable } from '@nestjs/common';

import {
  toFollowJson,
  toFollowRequestJson,
} from '../../common/mappers/api-json.mapper';
import { isPrismaUniqueConstraintError } from '../../common/utils/prisma.util';
import { PrismaService } from '../../prisma/prisma.service';
import { BlocksService } from '../blocks/blocks.service';

async function visibleFollowIds(
  blocksService: BlocksService,
  userId: string,
  ids: string[],
) {
  if (ids.length === 0) {
    return [];
  }

  const blockedIds = new Set([
    ...(await blocksService.blockedUserIds(userId)),
    ...(await blocksService.blockedByUserIds(userId)),
  ]);

  return ids.filter((id) => !blockedIds.has(id));
}

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocksService: BlocksService,
  ) {}

  private async createFollow(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.create({
      data: { followerId, followingId },
    });
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      }),
      this.prisma.user.update({
        where: { id: followingId },
        data: { followersCount: { increment: 1 } },
      }),
    ]);
    return toFollowJson(follow);
  }

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      return { error: 'self_follow' as const };
    }

    if (await this.blocksService.isBlockedBetween(followerId, followingId)) {
      return { error: 'blocked' as const };
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: followingId },
      select: { accountType: true },
    });
    if (!targetUser) {
      return { error: 'not_found' as const };
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });
    if (existingFollow) {
      return { error: 'already_following' as const };
    }

    if (targetUser.accountType === 'closed') {
      const existingPendingRequest = await this.prisma.followRequest.findFirst({
        where: {
          status: 'pending',
          OR: [
            { followerId, followingId },
            { followerId: followingId, followingId: followerId },
          ],
        },
      });

      if (existingPendingRequest) {
        return {
          error: 'request_exists' as const,
          request: toFollowRequestJson(existingPendingRequest),
        };
      }

      const request = await this.prisma.followRequest.create({
        data: { followerId, followingId, status: 'pending' },
      });

      return { request: toFollowRequestJson(request) };
    }

    try {
      const follow = await this.createFollow(followerId, followingId);
      return { follow };
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        return { error: 'already_following' as const };
      }
      throw error;
    }
  }

  async unfollow(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });

    if (follow.count === 0) {
      return false;
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      }),
      this.prisma.user.update({
        where: { id: followingId },
        data: { followersCount: { decrement: 1 } },
      }),
    ]);

    return true;
  }

  async cancelRequest(followerId: string, followingId: string) {
    const request = await this.prisma.followRequest.deleteMany({
      where: { followerId, followingId, status: 'pending' },
    });
    return request.count > 0;
  }

  async incomingRequests(userId: string) {
    const requests = await this.prisma.followRequest.findMany({
      where: { followingId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    const blockedIds = new Set([
      ...(await this.blocksService.blockedUserIds(userId)),
      ...(await this.blocksService.blockedByUserIds(userId)),
    ]);

    return requests
      .filter((request) => !blockedIds.has(request.followerId))
      .map(toFollowRequestJson);
  }

  async outgoingRequests(userId: string) {
    const requests = await this.prisma.followRequest.findMany({
      where: { followerId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    const blockedIds = new Set([
      ...(await this.blocksService.blockedUserIds(userId)),
      ...(await this.blocksService.blockedByUserIds(userId)),
    ]);

    return requests
      .filter((request) => !blockedIds.has(request.followingId))
      .map(toFollowRequestJson);
  }

  async acceptRequest(requestId: string, userId: string) {
    const request = await this.prisma.followRequest.findFirst({
      where: { id: requestId, followingId: userId, status: 'pending' },
    });

    if (!request) {
      return null;
    }

    if (
      await this.blocksService.isBlockedBetween(request.followerId, request.followingId)
    ) {
      return { error: 'blocked' as const };
    }

    const followerId = request.followerId;
    const followingId = request.followingId;

    let follow;
    try {
      follow = await this.createFollow(followerId, followingId);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        const updatedRequest = await this.prisma.followRequest.update({
          where: { id: requestId },
          data: { status: 'accepted' },
        });
        const existingFollow = await this.prisma.follow.findUnique({
          where: {
            followerId_followingId: { followerId, followingId },
          },
        });
        return {
          request: toFollowRequestJson(updatedRequest),
          follow: existingFollow ? toFollowJson(existingFollow) : null,
        };
      }
      throw error;
    }

    const updatedRequest = await this.prisma.followRequest.update({
      where: { id: requestId },
      data: { status: 'accepted' },
    });

    return {
      request: toFollowRequestJson(updatedRequest),
      follow,
    };
  }

  async rejectRequest(requestId: string, userId: string) {
    const request = await this.prisma.followRequest.updateMany({
      where: { id: requestId, followingId: userId, status: 'pending' },
      data: { status: 'rejected' },
    });

    if (request.count === 0) {
      return null;
    }

    const updated = await this.prisma.followRequest.findUnique({
      where: { id: requestId },
    });
    return updated ? toFollowRequestJson(updated) : null;
  }

  async followers(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: 'desc' },
    });
    const visibleIds = new Set(
      await visibleFollowIds(
        this.blocksService,
        userId,
        follows.map((follow) => follow.followerId),
      ),
    );

    return follows
      .filter((follow) => visibleIds.has(follow.followerId))
      .map(toFollowJson);
  }

  async following(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: 'desc' },
    });
    const visibleIds = new Set(
      await visibleFollowIds(
        this.blocksService,
        userId,
        follows.map((follow) => follow.followingId),
      ),
    );

    return follows
      .filter((follow) => visibleIds.has(follow.followingId))
      .map(toFollowJson);
  }

  async followerIds(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });
    return visibleFollowIds(
      this.blocksService,
      userId,
      follows.map((follow) => follow.followerId),
    );
  }

  async followingIds(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    return visibleFollowIds(
      this.blocksService,
      userId,
      follows.map((follow) => follow.followingId),
    );
  }
}
