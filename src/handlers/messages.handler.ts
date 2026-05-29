import { getUserId } from "@/lib/auth";
import { Elysia, t } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { MessagesService } from "@/services/messages.service";

export const messagesHandler = new Elysia({ tags: ["Messages"] })
  .use(authPlugin)
  .post(
    "/conversations",
    async ({ userId, body, set }) => {
      const result = await MessagesService.createConversation({
        type: body.type,
        members: body.members.includes(getUserId(userId))
          ? body.members
          : [...body.members, getUserId(userId)],
      });
      if ("error" in result) {
        set.status = 403;
        return { error: "Conversation contains blocked users" };
      }
      return result;
    },
    {
      auth: true,
      body: t.Object({
        type: t.Union([t.Literal("private"), t.Literal("group")]),
        members: t.Array(t.String(), { minItems: 1 }),
      }),
      detail: { summary: "Create conversation" },
    }
  )
  .get(
    "/conversations",
    ({ userId }) => MessagesService.listConversations(getUserId(userId)),
    {
      auth: true,
      detail: { summary: "List conversations" },
    }
  )
  .get(
    "/conversations/:id/messages",
    async ({ params: { id }, userId, set }) => {
      const result = await MessagesService.listMessages(id, getUserId(userId));
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Conversation not found" };
      }
      if (result.error === "blocked") {
        set.status = 403;
        return { error: "Conversation is blocked" };
      }
      return result.messages;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "List conversation messages" },
    }
  )
  .post(
    "/conversations/:id/messages",
    async ({ params: { id }, userId, body, set }) => {
      if (!(await MessagesService.isMember(id, getUserId(userId)))) {
        set.status = 403;
        return { error: "Forbidden" };
      }
      const message = await MessagesService.sendMessage({
        conversationId: id,
        senderId: getUserId(userId),
        text: body.text,
        ...(body.attachments !== undefined
          ? { attachments: body.attachments }
          : {}),
      });
      if (!message) {
        set.status = 404;
        return { error: "Conversation not found" };
      }
      if ("error" in message) {
        set.status = 403;
        return { error: "Message blocked" };
      }
      return message;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        text: t.String({ minLength: 1, maxLength: 5000 }),
        attachments: t.Optional(
          t.Array(
            t.Object({
              type: t.String(),
              url: t.String(),
            })
          )
        ),
      }),
      detail: { summary: "Send message" },
    }
  );
