import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { IncomingMessage } from 'node:http';
import type { WebSocket } from 'ws';

import { isWsEvent, WsHubService } from '../../common/services/ws-hub.service';
import { LocationService } from '../location/location.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
@WebSocketGateway({ path: '/ws' })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly wsHub: WsHubService,
    private readonly messagesService: MessagesService,
    private readonly locationService: LocationService,
  ) {}

  async handleConnection(client: WebSocket, request: IncomingMessage) {
    try {
      const url = new URL(request.url ?? '/ws', 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) {
        client.close(4401, 'Unauthorized');
        return;
      }

      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      if (!payload.sub) {
        client.close(4401, 'Unauthorized');
        return;
      }

      this.wsHub.add(payload.sub, client);
      client.on('message', (data) => {
        this.handleRawMessage(client, data);
      });
    } catch (error) {
      this.logger.debug(`WebSocket auth failed: ${String(error)}`);
      client.close(4401, 'Unauthorized');
    }
  }

  handleDisconnect(client: WebSocket) {
    const userId = this.wsHub.remove(client);
    if (userId) {
      void this.locationService.flush(userId);
    }
  }

  private handleRawMessage(client: WebSocket, message: unknown) {
    let parsed: { event?: string; data?: Record<string, unknown> };
    try {
      parsed = JSON.parse(String(message)) as {
        event?: string;
        data?: Record<string, unknown>;
      };
    } catch {
      return;
    }

    if (!parsed.event || !isWsEvent(parsed.event)) {
      return;
    }

    if (parsed.event !== 'typing:start' && parsed.event !== 'typing:stop') {
      return;
    }

    const event = parsed.event;
    const conversationId = parsed.data?.conversationId;
    const userId = this.wsHub.getUserId(client);
    if (typeof conversationId !== 'string' || !userId) {
      return;
    }

    void this.messagesService.isMember(conversationId, userId).then(async (allowed) => {
      if (!allowed) {
        return;
      }

      const members = await this.messagesService.memberIds(conversationId);
      for (const memberId of members) {
        if (memberId !== userId) {
          this.wsHub.emitToUser(memberId, event, {
            conversationId,
            userId,
          });
        }
      }
    });
  }
}
