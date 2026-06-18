import { apiRequest, getStoredAccessToken } from '@/shared/api';
import { env } from '@/shared/config';

import type { ChatMessage } from '../model';
import { mapChatMessage, type BackendMessageDto } from './mappers';

export type ChatSocketEventMapped =
  | { type: 'connected'; chatId: string }
  | { type: 'message'; message: ChatMessage }
  | { type: 'error'; message: string };

type WsEnvelope = {
  event?: string;
  data?: unknown;
};

export function connectChatSocket(
  chatId: string,
  onEvent: (event: ChatSocketEventMapped) => void,
) {
  let socket: WebSocket | null = null;
  let isClosed = false;

  void getStoredAccessToken().then((token) => {
    if (isClosed) {
      return;
    }

    const url = new URL('/ws', env.wsUrl);

    if (token) {
      url.searchParams.set('token', token);
    }

    socket = new WebSocket(url.toString());

    socket.onopen = () => {
      onEvent({ type: 'connected', chatId });
    };

    socket.onmessage = (message) => {
      try {
        const envelope = JSON.parse(String(message.data)) as WsEnvelope;

        if (envelope.event === 'message:new' && envelope.data) {
          onEvent({ type: 'message', message: mapChatMessage(envelope.data as BackendMessageDto) });
        }
      } catch {
        onEvent({ type: 'error', message: 'Не удалось обработать событие чата' });
      }
    };

    socket.onerror = () => {
      onEvent({ type: 'error', message: 'Ошибка WebSocket соединения' });
    };
  });

  return () => {
    isClosed = true;
    socket?.close();
  };
}

export async function sendChatSocketMessage(chatId: string, text: string): Promise<ChatMessage> {
  const data = await apiRequest<BackendMessageDto>(`/conversations/${chatId}/messages`, {
    method: 'POST',
    body: { text, attachments: [] },
  });
  return mapChatMessage(data);
}

export async function getChatPeerName() {
  return 'Чат';
}
