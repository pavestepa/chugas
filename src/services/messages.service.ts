import {
  ConversationModel,
  toConversationJson,
} from "@/schemas/conversation.schema";
import { MessageModel, toMessageJson } from "@/schemas/message.schema";
import { wsHub } from "@/lib/ws-hub";
import { BlocksService } from "@/services/blocks.service";

const MESSAGE_TTL_HOURS = 5;
const MAX_MESSAGES_PER_CONVERSATION = 50;

function messageExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + MESSAGE_TTL_HOURS * 60 * 60 * 1000);
}

async function hasBlockedMember(userId: string, members: unknown[]) {
  for (const member of members) {
    const memberId = String(member);
    if (
      memberId !== userId &&
      (await BlocksService.isBlockedBetween(userId, memberId))
    ) {
      return true;
    }
  }

  return false;
}

async function trimConversationMessages(conversationId: string) {
  const staleMessages = await MessageModel.find({ conversationId })
    .sort({ createdAt: -1 })
    .skip(MAX_MESSAGES_PER_CONVERSATION)
    .select("_id");

  if (staleMessages.length === 0) {
    return;
  }

  await MessageModel.deleteMany({
    _id: { $in: staleMessages.map((message) => message._id) },
  });
}

export const MessagesService = {
  createConversation: async (input: {
    type: "private" | "group";
    members: string[];
  }) => {
    for (const memberId of input.members) {
      const otherMembers = input.members.filter(
        (otherId) => otherId !== memberId
      );
      for (const otherMemberId of otherMembers) {
        if (await BlocksService.isBlockedBetween(memberId, otherMemberId)) {
          return { error: "blocked" as const };
        }
      }
    }

    const conversation = await ConversationModel.create({
      type: input.type,
      members: input.members,
      lastMessageAt: new Date(),
    });
    return toConversationJson(conversation);
  },

  listConversations: async (userId: string) => {
    const conversations = await ConversationModel.find({
      members: userId,
    }).sort({ lastMessageAt: -1 });
    const visible = await Promise.all(
      conversations.map(async (conversation) =>
        (await hasBlockedMember(userId, conversation.members))
          ? null
          : toConversationJson(conversation)
      )
    );
    return visible.filter((conversation) => conversation !== null);
  },

  listMessages: async (conversationId: string, userId: string) => {
    const conversation = await ConversationModel.findOne({
      _id: conversationId,
      members: userId,
    });
    if (!conversation) {
      return { error: "not_found" as const };
    }

    if (await hasBlockedMember(userId, conversation.members)) {
      return { error: "blocked" as const };
    }

    const messages = await MessageModel.find({ conversationId }).sort({
      createdAt: 1,
    });
    return { messages: messages.map(toMessageJson) };
  },

  sendMessage: async (input: {
    conversationId: string;
    senderId: string;
    text: string;
    attachments?: { type: string; url: string }[];
  }) => {
    const conversation = await ConversationModel.findById(input.conversationId);
    if (!conversation) {
      return null;
    }

    for (const memberId of conversation.members) {
      if (
        memberId.toString() !== input.senderId &&
        (await BlocksService.isBlockedBetween(
          input.senderId,
          memberId.toString()
        ))
      ) {
        return { error: "blocked" as const };
      }
    }

    const message = await MessageModel.create({
      ...input,
      expiresAt: messageExpiresAt(),
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();
    await trimConversationMessages(input.conversationId);

    const payload = toMessageJson(message);
    for (const memberId of conversation.members) {
      wsHub.emitToUser(memberId.toString(), "message:new", payload);
    }

    return payload;
  },

  isMember: async (conversationId: string, userId: string) => {
    const conversation = await ConversationModel.findOne({
      _id: conversationId,
      members: userId,
    });
    return Boolean(conversation);
  },

  memberIds: async (conversationId: string) => {
    const conversation =
      await ConversationModel.findById(conversationId).select("members");
    if (!conversation) {
      return [];
    }
    return conversation.members.map((memberId) => memberId.toString());
  },
};
