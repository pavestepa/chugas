import { apiRequest } from '@/shared/api';

import type { Chat, ChatId, ChatMessage, CreateConversationPayload } from '../model';
import { mapChat, mapChatMessage, type BackendConversationDto, type BackendMessageDto } from './mappers';

function unwrapConversations(
  data: BackendConversationDto[] | { conversations?: BackendConversationDto[]; items?: BackendConversationDto[] },
) {
  return Array.isArray(data) ? data : data.conversations ?? data.items ?? [];
}

function unwrapMessages(data: BackendMessageDto[] | { messages?: BackendMessageDto[]; items?: BackendMessageDto[] }) {
  return Array.isArray(data) ? data : data.messages ?? data.items ?? [];
}

export async function getChats(): Promise<Chat[]> {
  const data = await apiRequest<
    BackendConversationDto[] | { conversations?: BackendConversationDto[]; items?: BackendConversationDto[] }
  >('/conversations');
  return unwrapConversations(data).map(mapChat);
}

export async function getChatMessages(chatId: ChatId): Promise<ChatMessage[]> {
  const data = await apiRequest<BackendMessageDto[] | { messages?: BackendMessageDto[]; items?: BackendMessageDto[] }>(
    `/conversations/${chatId}/messages`,
  );
  return unwrapMessages(data).map(mapChatMessage);
}

export async function createConversation(payload: CreateConversationPayload): Promise<Chat> {
  const data = await apiRequest<BackendConversationDto>('/conversations', {
    method: 'POST',
    body: payload,
  });
  return mapChat(data);
}

export async function sendChatMessage(chatId: ChatId, text: string, attachments: unknown[] = []): Promise<ChatMessage> {
  const data = await apiRequest<BackendMessageDto>(`/conversations/${chatId}/messages`, {
    method: 'POST',
    body: { text, attachments },
  });
  return mapChatMessage(data);
}

export { connectChatSocket, getChatPeerName, sendChatSocketMessage } from './chat-socket';
export type { ChatSocketEventMapped } from './chat-socket';
