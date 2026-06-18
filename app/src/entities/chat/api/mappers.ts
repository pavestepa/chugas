import { readEntityId } from '@/shared/api/dto';

import type { Chat, ChatMessage, MessageAttachment } from '../model';

export type BackendMessageDto = {
  _id?: string;
  id?: string;
  conversationId?: string;
  chatId?: string;
  senderId?: string;
  sender_id?: string;
  sender?: string | { _id?: string; id?: string };
  text?: string;
  attachments?: MessageAttachment[];
  createdAt?: string;
  created_at?: string;
  expiresAt?: string;
  expires_at?: string;
};

export type BackendConversationDto = {
  _id?: string;
  id?: string;
  type?: Chat['type'];
  members?: Array<string | { _id?: string; id?: string }>;
  lastMessage?: BackendMessageDto;
  last_message?: BackendMessageDto;
  lastMessageAt?: string;
  last_message_at?: string;
  createdAt?: string;
  created_at?: string;
};

function getUserId(value: string | { _id?: string; id?: string }) {
  return typeof value === 'string' ? value : value._id ?? value.id ?? '';
}

function getSenderId(json: BackendMessageDto) {
  if (typeof json.sender === 'string') {
    return json.sender;
  }

  return json.senderId ?? json.sender_id ?? json.sender?._id ?? json.sender?.id ?? '';
}

export function mapChatMessage(json: BackendMessageDto): ChatMessage {
  return {
    id: readEntityId(json),
    chatId: json.conversationId ?? json.chatId ?? '',
    senderId: getSenderId(json),
    text: json.text ?? '',
    attachments: json.attachments ?? [],
    createdAt: json.createdAt ?? json.created_at ?? new Date().toISOString(),
    expiresAt: json.expiresAt ?? json.expires_at ?? new Date().toISOString(),
  };
}

export function mapChat(json: BackendConversationDto): Chat {
  const memberIds = json.members?.map(getUserId) ?? [];
  const lastMessage = json.lastMessage ?? json.last_message;

  return {
    id: readEntityId(json),
    type: json.type ?? 'private',
    memberIds,
    lastMessage: lastMessage ? mapChatMessage(lastMessage) : undefined,
    lastMessageAt:
      json.lastMessageAt ??
      json.last_message_at ??
      lastMessage?.createdAt ??
      lastMessage?.created_at ??
      json.createdAt ??
      json.created_at ??
      new Date().toISOString(),
    createdAt: json.createdAt ?? json.created_at ?? new Date().toISOString(),
  };
}
