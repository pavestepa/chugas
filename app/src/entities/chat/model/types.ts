import type { UserId } from '@/entities/user';
import type { User } from '@/entities/user';

export type ChatId = string;
export type ChatMessageId = string;
export type ConversationType = 'private' | 'group';

export type MessageAttachment = {
  type: string;
  url: string;
};

export type Chat = {
  id: ChatId;
  type: ConversationType;
  memberIds: UserId[];
  members?: User[];
  lastMessage?: ChatMessage;
  lastMessageAt: string;
  createdAt: string;
};

export type ChatMessage = {
  id: ChatMessageId;
  chatId: ChatId;
  senderId: UserId;
  text: string;
  attachments: MessageAttachment[];
  createdAt: string;
  expiresAt: string;
};

export type CreateConversationPayload = {
  type: ConversationType;
  members: UserId[];
};
