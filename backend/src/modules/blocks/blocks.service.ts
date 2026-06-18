import { Injectable } from '@nestjs/common';

import { toUserBlockJson } from '../../common/mappers/api-json.mapper';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      return { error: 'self_block' as const };
    }

    const block = await this.prisma.userBlock.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      create: { blockerId, blockedId },
      update: {},
    });

    const follows = await this.prisma.follow.findMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
      select: { id: true, followerId: true, followingId: true },
    });

    if (follows.length > 0) {
      await this.prisma.$transaction([
        this.prisma.follow.deleteMany({
          where: { id: { in: follows.map((follow) => follow.id) } },
        }),
        this.prisma.followRequest.deleteMany({
          where: {
            status: 'pending',
            OR: [
              { followerId: blockerId, followingId: blockedId },
              { followerId: blockedId, followingId: blockerId },
            ],
          },
        }),
        ...follows.flatMap((follow) => [
          this.prisma.user.update({
            where: { id: follow.followerId },
            data: { followingCount: { decrement: 1 } },
          }),
          this.prisma.user.update({
            where: { id: follow.followingId },
            data: { followersCount: { decrement: 1 } },
          }),
        ]),
      ]);
    } else {
      await this.prisma.followRequest.deleteMany({
        where: {
          status: 'pending',
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      });
    }

    return { block: toUserBlockJson(block) };
  }

  async unblock(blockerId: string, blockedId: string) {
    const block = await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });
    return block.count > 0;
  }

  async blockedUsers(blockerId: string) {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerId },
      orderBy: { createdAt: 'desc' },
    });
    return blocks.map(toUserBlockJson);
  }

  async blockedUserIds(blockerId: string) {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerId },
      select: { blockedId: true },
    });
    return blocks.map((block) => block.blockedId);
  }

  async isBlockedBetween(userA: string, userB: string) {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    });
    return Boolean(block);
  }

  async blockedByUserIds(userId: string) {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockedId: userId },
      select: { blockerId: true },
    });
    return blocks.map((block) => block.blockerId);
  }
}
