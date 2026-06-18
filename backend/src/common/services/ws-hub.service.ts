import { Injectable } from '@nestjs/common';

export type WsEvent =
  | 'location:update'
  | 'location:following_updated'
  | 'message:new'
  | 'typing:start'
  | 'typing:stop'
  | 'notification:new';

interface WsMessage {
  event: WsEvent;
  data: unknown;
}

interface WsSocket {
  send: (data: string) => void;
}

@Injectable()
export class WsHubService {
  private readonly connections = new Map<string, Set<WsSocket>>();
  private readonly socketUsers = new WeakMap<WsSocket, string>();

  add(userId: string, ws: WsSocket) {
    const current = this.connections.get(userId) ?? new Set();
    current.add(ws);
    this.connections.set(userId, current);
    this.socketUsers.set(ws, userId);
  }

  remove(ws: WsSocket): string | null {
    const userId = this.socketUsers.get(ws);
    if (!userId) {
      return null;
    }

    const current = this.connections.get(userId);
    current?.delete(ws);
    if (current?.size === 0) {
      this.connections.delete(userId);
    }
    this.socketUsers.delete(ws);
    return userId;
  }

  getUserId(ws: WsSocket): string | null {
    return this.socketUsers.get(ws) ?? null;
  }

  emitToUser(userId: string, event: WsEvent, data: unknown) {
    const sockets = this.connections.get(userId);
    if (!sockets) {
      return;
    }

    const message = JSON.stringify({ event, data } satisfies WsMessage);
    for (const ws of sockets) {
      ws.send(message);
    }
  }
}

export function isWsEvent(value: string): value is WsEvent {
  return [
    'location:update',
    'location:following_updated',
    'message:new',
    'typing:start',
    'typing:stop',
    'notification:new',
  ].includes(value);
}
