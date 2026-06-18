import { Injectable } from '@nestjs/common';

import {
  toConversationJson,
  toMessageJson,
} from '../../common/mappers/api-json.mapper';
import { messageExpiresAt } from '../../common/utils/geo.util';
import { WsHubService } from '../../common/services/ws-hub.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BlocksService } from '../blocks/blocks.service';

const MAX_MESSAGES_PER_CONVERSATION = 50;

async function hasBlockedMember(
  blocksService: BlocksService,
  userId: string,
  memberIds: string[],
) {
  for (const memberId of memberIds) {
    if (
      memberId !== userId &&
      (await blocksService.isBlockedBetween(userId, memberId))
    ) {
      return true;
    }
  }

  return false;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocksService: BlocksService,
    private readonly wsHub: WsHubService,
  ) {}

  private async trimConversationMessages(conversationId: string) {
    const staleMessages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip: MAX_MESSAGES_PER_CONVERSATION,
      select: { id: true },
    });

    if (staleMessages.length === 0) {
      return;
    }

    await this.prisma.message.deleteMany({
      where: { id: { in: staleMessages.map((message) => message.id) } },
    });
  }

  private async getMemberIds(conversationId: string): Promise<string[]> {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return members.map((member) => member.userId);
  }

  async createConversation(input: { type: 'private' | 'group'; members: string[] }) {
    for (const memberId of input.members) {
      const otherMembers = input.members.filter((otherId) => otherId !== memberId);
      for (const otherMemberId of otherMembers) {
        if (await this.blocksService.isBlockedBetween(memberId, otherMemberId)) {
          return { error: 'blocked' as const };
        }
      }
    }

    const conversation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.conversation.create({
        data: {
          type: input.type,
          lastMessageAt: new Date(),
        },
      });
      await tx.conversationMember.createMany({
        data: input.members.map((userId) => ({
          conversationId: created.id,
          userId,
        })),
      });
      return created;
    });

    return toConversationJson(conversation, input.members);
  }

  async listConversations(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    const conversations = await this.prisma.conversation.findMany({
      where: { id: { in: memberships.map((membership) => membership.conversationId) } },
      orderBy: { lastMessageAt: 'desc' },
    });

    const visible = await Promise.all(
      conversations.map(async (conversation) => {
        const members = await this.getMemberIds(conversation.id);
        if (await hasBlockedMember(this.blocksService, userId, members)) {
          return null;
        }
        return toConversationJson(conversation, members);
      }),
    );

    return visible.filter((conversation) => conversation !== null);
  }

  async listMessages(conversationId: string, userId: string) {
    const membership = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    if (!membership) {
      return { error: 'not_found' as const };
    }

    const members = await this.getMemberIds(conversationId);
    if (await hasBlockedMember(this.blocksService, userId, members)) {
      return { error: 'blocked' as const };
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
    return { messages: messages.map(toMessageJson) };
  }

  async sendMessage(input: {
    conversationId: string;
    senderId: string;
    text: string;
    attachments?: { type: string; url: string }[];
  }) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: input.conversationId },
    });
    if (!conversation) {
      return null;
    }

    const members = await this.getMemberIds(input.conversationId);
    for (const memberId of members) {
      if (
        memberId !== input.senderId &&
        (await this.blocksService.isBlockedBetween(input.senderId, memberId))
      ) {
        return { error: 'blocked' as const };
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        text: input.text,
        attachments: input.attachments ?? [],
        expiresAt: messageExpiresAt(),
      },
    });

    await this.prisma.conversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: new Date() },
    });
    await this.trimConversationMessages(input.conversationId);

    const payload = toMessageJson(message);
    for (const memberId of members) {
      this.wsHub.emitToUser(memberId, 'message:new', payload);
    }

    return payload;
  }

  async isMember(conversationId: string, userId: string) {
    const membership = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    return Boolean(membership);
  }

  async memberIds(conversationId: string) {
    return this.getMemberIds(conversationId);
  }
}
