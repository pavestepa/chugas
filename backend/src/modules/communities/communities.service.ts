import { Injectable } from '@nestjs/common';
import type { Community } from '@prisma/client';

import {
  toCommunityBanJson,
  toCommunityJson,
  toCommunityMemberJson,
  toCommunityRequestJson,
} from '../../common/mappers/api-json.mapper';
import { CascadeService } from '../../common/services/cascade.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cascadeService: CascadeService,
  ) {}

  async getModeratorIds(communityId: string): Promise<string[]> {
    const members = await this.prisma.communityMember.findMany({
      where: {
        communityId,
        role: { in: ['moderator', 'owner'] },
      },
      select: { userId: true },
    });
    return members.map((member) => member.userId);
  }

  async toCommunityJsonWithModerators(community: Community) {
    const moderatorIds = await this.getModeratorIds(community.id);
    return toCommunityJson(community, moderatorIds);
  }

  async create(input: {
    nickname: string;
    title: string;
    description?: string;
    bio?: string;
    avatarUrl?: string;
    ownerId: string;
    access: 'open' | 'closed';
  }) {
    const community = await this.prisma.$transaction(async (tx) => {
      const created = await tx.community.create({
        data: {
          nickname: input.nickname,
          title: input.title,
          description: input.description ?? '',
          bio: input.bio ?? '',
          avatarUrl: input.avatarUrl ?? '',
          ownerId: input.ownerId,
          access: input.access,
          membersCount: 1,
        },
      });
      await tx.communityMember.create({
        data: {
          communityId: created.id,
          userId: input.ownerId,
          role: 'owner',
        },
      });
      return created;
    });

    return this.toCommunityJsonWithModerators(community);
  }

  async findById(id: string) {
    const community = await this.prisma.community.findUnique({ where: { id } });
    return community ? this.toCommunityJsonWithModerators(community) : null;
  }

  async join(communityId: string, userId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      return { error: 'not_found' as const };
    }

    if (await this.isBanned(communityId, userId)) {
      return { error: 'banned' as const };
    }

    const existingMember = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (existingMember) {
      return { error: 'already_member' as const };
    }

    if (community.access === 'closed') {
      const existingRequest = await this.prisma.communityRequest.findFirst({
        where: { communityId, fromUserId: userId, status: 'pending' },
      });

      const request =
        existingRequest ??
        (await this.prisma.communityRequest.create({
          data: { communityId, fromUserId: userId, status: 'pending' },
        }));

      return { request: toCommunityRequestJson(request) };
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityMember.create({
        data: { communityId, userId },
      });
      await tx.community.update({
        where: { id: communityId },
        data: { membersCount: { increment: 1 } },
      });
      return created;
    });

    return { member: toCommunityMemberJson(member) };
  }

  async leave(communityId: string, userId: string) {
    if (await this.isOwner(communityId, userId)) {
      return { error: 'owner_cannot_leave' as const };
    }

    const member = await this.prisma.communityMember.deleteMany({
      where: { communityId, userId },
    });
    if (member.count === 0) {
      return { error: 'not_found' as const };
    }

    await this.prisma.community.update({
      where: { id: communityId },
      data: { membersCount: { decrement: 1 } },
    });
    return { success: true as const };
  }

  async isMember(communityId: string, userId: string) {
    const member = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    return Boolean(member);
  }

  async memberRole(communityId: string, userId: string) {
    const member = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    return member?.role ?? null;
  }

  async isBanned(communityId: string, userId: string) {
    const ban = await this.prisma.communityBan.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    return Boolean(ban);
  }

  async isModerator(communityId: string, userId: string) {
    const member = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    return member?.role === 'owner' || member?.role === 'moderator';
  }

  async isOwner(communityId: string, userId: string) {
    const community = await this.prisma.community.findFirst({
      where: { id: communityId, ownerId: userId },
    });
    return Boolean(community);
  }

  async update(
    communityId: string,
    actorId: string,
    input: {
      title?: string;
      bio?: string;
      description?: string;
      avatarUrl?: string;
      access?: 'open' | 'closed';
      nickname?: string;
    },
  ) {
    if (!(await this.isModerator(communityId, actorId))) {
      return { error: 'forbidden' as const };
    }

    if (
      (input.nickname !== undefined || input.access !== undefined) &&
      !(await this.isOwner(communityId, actorId))
    ) {
      return { error: 'owner_required' as const };
    }

    try {
      const community = await this.prisma.community.update({
        where: { id: communityId },
        data: input,
      });
      return { community: await this.toCommunityJsonWithModerators(community) };
    } catch {
      return { error: 'not_found' as const };
    }
  }

  async requests(communityId: string, moderatorId: string) {
    if (!(await this.isModerator(communityId, moderatorId))) {
      return { error: 'forbidden' as const };
    }

    const requests = await this.prisma.communityRequest.findMany({
      where: { communityId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    return { requests: requests.map(toCommunityRequestJson) };
  }

  async acceptRequest(
    communityId: string,
    requestId: string,
    moderatorId: string,
  ) {
    if (!(await this.isModerator(communityId, moderatorId))) {
      return { error: 'forbidden' as const };
    }

    const request = await this.prisma.communityRequest.findFirst({
      where: { id: requestId, communityId, status: 'pending' },
    });
    if (!request) {
      return { error: 'not_found' as const };
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.communityMember.upsert({
        where: {
          communityId_userId: {
            communityId,
            userId: request.fromUserId,
          },
        },
        create: {
          communityId,
          userId: request.fromUserId,
          role: 'member',
        },
        update: { role: 'member' },
      });
      await tx.communityRequest.update({
        where: { id: requestId },
        data: { status: 'accepted' },
      });
      await tx.community.update({
        where: { id: communityId },
        data: { membersCount: { increment: 1 } },
      });
      return upserted;
    });

    const updatedRequest = await this.prisma.communityRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    return {
      request: toCommunityRequestJson(updatedRequest),
      member: toCommunityMemberJson(member),
    };
  }

  async rejectRequest(
    communityId: string,
    requestId: string,
    moderatorId: string,
  ) {
    if (!(await this.isModerator(communityId, moderatorId))) {
      return { error: 'forbidden' as const };
    }

    const updated = await this.prisma.communityRequest.updateMany({
      where: { id: requestId, communityId, status: 'pending' },
      data: { status: 'rejected' },
    });
    if (updated.count === 0) {
      return { error: 'not_found' as const };
    }

    const request = await this.prisma.communityRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
    return { request: toCommunityRequestJson(request) };
  }

  async addModerator(
    communityId: string,
    targetUserId: string,
    ownerId: string,
  ) {
    if (!(await this.isOwner(communityId, ownerId))) {
      return { error: 'forbidden' as const };
    }

    const member = await this.prisma.communityMember.updateMany({
      where: { communityId, userId: targetUserId },
      data: { role: 'moderator' },
    });
    if (member.count === 0) {
      return { error: 'not_found' as const };
    }

    const updatedMember = await this.prisma.communityMember.findUniqueOrThrow({
      where: { communityId_userId: { communityId, userId: targetUserId } },
    });
    const community = await this.prisma.community.findUniqueOrThrow({
      where: { id: communityId },
    });

    return {
      community: await this.toCommunityJsonWithModerators(community),
      member: toCommunityMemberJson(updatedMember),
    };
  }

  async removeModerator(
    communityId: string,
    targetUserId: string,
    ownerId: string,
  ) {
    if (!(await this.isOwner(communityId, ownerId))) {
      return { error: 'forbidden' as const };
    }

    const community = await this.prisma.community.findFirst({
      where: { id: communityId, ownerId },
    });
    if (!community || community.ownerId === targetUserId) {
      return { error: 'not_found' as const };
    }

    const updated = await this.prisma.communityMember.updateMany({
      where: { communityId, userId: targetUserId, role: 'moderator' },
      data: { role: 'member' },
    });
    if (updated.count === 0) {
      return { error: 'not_found' as const };
    }

    const member = await this.prisma.communityMember.findUniqueOrThrow({
      where: { communityId_userId: { communityId, userId: targetUserId } },
    });
    const refreshedCommunity = await this.prisma.community.findUniqueOrThrow({
      where: { id: communityId },
    });

    return {
      community: await this.toCommunityJsonWithModerators(refreshedCommunity),
      member: toCommunityMemberJson(member),
    };
  }

  async banUser(
    communityId: string,
    targetUserId: string,
    actorId: string,
    reason?: string,
  ) {
    const actorRole = await this.memberRole(communityId, actorId);
    if (actorRole !== 'owner' && actorRole !== 'moderator') {
      return { error: 'forbidden' as const };
    }

    const targetRole = await this.memberRole(communityId, targetUserId);
    if (targetRole === 'owner') {
      return { error: 'cannot_ban_owner' as const };
    }

    if (targetRole === 'moderator' && actorRole !== 'owner') {
      return { error: 'cannot_ban_moderator' as const };
    }

    const ban = await this.prisma.communityBan.upsert({
      where: {
        communityId_userId: { communityId, userId: targetUserId },
      },
      create: {
        communityId,
        userId: targetUserId,
        bannedById: actorId,
        reason: reason ?? '',
      },
      update: {
        bannedById: actorId,
        reason: reason ?? '',
      },
    });

    const member = await this.prisma.communityMember.deleteMany({
      where: { communityId, userId: targetUserId },
    });
    if (member.count > 0) {
      await this.prisma.community.update({
        where: { id: communityId },
        data: { membersCount: { decrement: 1 } },
      });
    }

    return { ban: toCommunityBanJson(ban) };
  }

  async unbanUser(communityId: string, targetUserId: string, actorId: string) {
    if (!(await this.isModerator(communityId, actorId))) {
      return { error: 'forbidden' as const };
    }

    const ban = await this.prisma.communityBan.deleteMany({
      where: { communityId, userId: targetUserId },
    });
    if (ban.count === 0) {
      return { error: 'not_found' as const };
    }

    return { success: true as const };
  }

  async bans(communityId: string, actorId: string) {
    if (!(await this.isModerator(communityId, actorId))) {
      return { error: 'forbidden' as const };
    }

    const bans = await this.prisma.communityBan.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
    });
    return { bans: bans.map(toCommunityBanJson) };
  }

  async deletePost(communityId: string, postId: string, actorId: string) {
    if (!(await this.isModerator(communityId, actorId))) {
      return { error: 'forbidden' as const };
    }

    const post = await this.prisma.post.findFirst({
      where: { id: postId, communityId },
      select: { id: true },
    });
    if (!post) {
      return { error: 'not_found' as const };
    }

    await this.cascadeService.deletePost(postId);
    return { success: true as const };
  }

  async deleteCommunity(communityId: string, ownerId: string) {
    if (!(await this.isOwner(communityId, ownerId))) {
      return { error: 'forbidden' as const };
    }

    const community = await this.prisma.community.deleteMany({
      where: { id: communityId, ownerId },
    });
    if (community.count === 0) {
      return { error: 'not_found' as const };
    }

    await this.prisma.$transaction([
      this.prisma.communityMember.deleteMany({ where: { communityId } }),
      this.prisma.communityRequest.deleteMany({ where: { communityId } }),
      this.prisma.communityBan.deleteMany({ where: { communityId } }),
    ]);
    await this.cascadeService.deleteCommunityPosts(communityId);

    return { success: true as const };
  }
}
