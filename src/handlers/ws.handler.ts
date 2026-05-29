import { Elysia, t } from "elysia";
import { isWsEvent, wsHub } from "@/lib/ws-hub";
import { authPlugin } from "@/plugins/auth.plugin";
import { LocationService } from "@/services/location.service";
import { MessagesService } from "@/services/messages.service";

export const wsHandler = new Elysia({ tags: ["WebSocket"] })
  .use(authPlugin)
  .ws("/ws", {
    query: t.Object({ token: t.String() }),
    async open(ws) {
      const payload = await ws.data.jwt.verify(ws.data.query.token);
      if (!payload || typeof payload.sub !== "string") {
        ws.close(4401, "Unauthorized");
        return;
      }

      wsHub.add(payload.sub, ws);
    },
    message(ws, message) {
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

      if (parsed.event !== "typing:start" && parsed.event !== "typing:stop") {
        return;
      }

      const event = parsed.event;
      const conversationId = parsed.data?.conversationId;
      const userId = wsHub.getUserId(ws);
      if (typeof conversationId !== "string" || !userId) {
        return;
      }

      void MessagesService.isMember(conversationId, userId).then(
        async (allowed) => {
          if (!allowed) {
            return;
          }

          const members = await MessagesService.memberIds(conversationId);
          for (const memberId of members) {
            if (memberId !== userId) {
              wsHub.emitToUser(memberId, event, {
                conversationId,
                userId,
              });
            }
          }
        }
      );
    },
    close(ws) {
      const userId = wsHub.remove(ws);
      if (userId) {
        void LocationService.flush(userId);
      }
    },
    detail: {
      summary: "WebSocket for realtime events",
      description:
        "Connect with ?token=JWT. Events: location:update, location:friend_updated, message:new, typing:start, typing:stop, notification:new",
    },
  });
