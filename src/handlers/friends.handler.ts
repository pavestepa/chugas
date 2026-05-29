import { getUserId } from "@/lib/auth";
import { Elysia, t } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { FriendsService } from "@/services/friends.service";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export const friendsHandler = new Elysia({ tags: ["Friends"] })
  .use(authPlugin)
  .post(
    "/users/:id/friend-requests",
    async ({ params: { id }, userId, set }) => {
      const currentUserId = getUserId(userId);
      const limit = await rateLimit({
        scope: "friend-request",
        identity: currentUserId,
        limit: 20,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      const result = await FriendsService.sendRequest(currentUserId, id);

      if ("error" in result) {
        if (result.error === "self_request") {
          set.status = 400;
          return { error: "Cannot send friend request to yourself" };
        }

        if (result.error === "already_friends") {
          set.status = 409;
          return { error: "Users are already friends" };
        }

        if (result.error === "blocked") {
          set.status = 403;
          return { error: "Friend request is blocked" };
        }

        set.status = 409;
        return {
          error: "Friend request already exists",
          request: result.request,
        };
      }

      return result.request;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Send friend request" },
    }
  )
  .get(
    "/friend-requests",
    ({ userId }) => FriendsService.incomingRequests(getUserId(userId)),
    {
      auth: true,
      detail: { summary: "Get incoming friend requests" },
    }
  )
  .get(
    "/friend-requests/sent",
    ({ userId }) => FriendsService.outgoingRequests(getUserId(userId)),
    {
      auth: true,
      detail: { summary: "Get outgoing friend requests" },
    }
  )
  .post(
    "/friend-requests/:id/accept",
    async ({ params: { id }, userId, set }) => {
      const result = await FriendsService.acceptRequest(id, getUserId(userId));
      if (result && "error" in result) {
        set.status = 403;
        return { error: "Friend request is blocked" };
      }
      if (!result) {
        set.status = 404;
        return { error: "Friend request not found" };
      }

      return result;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Accept friend request" },
    }
  )
  .post(
    "/friend-requests/:id/reject",
    async ({ params: { id }, userId, set }) => {
      const request = await FriendsService.rejectRequest(id, getUserId(userId));
      if (!request) {
        set.status = 404;
        return { error: "Friend request not found" };
      }

      return request;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Reject friend request" },
    }
  )
  .delete(
    "/friends/:id",
    async ({ params: { id }, userId, set }) => {
      if (!(await FriendsService.removeFriend(getUserId(userId), id))) {
        set.status = 404;
        return { error: "Friendship not found" };
      }

      set.status = 204;
      return null;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Remove friend" },
    }
  )
  .get(
    "/users/:id/friends",
    ({ params: { id } }) => FriendsService.friendships(id),
    {
      params: t.Object({ id: t.String() }),
      detail: { summary: "Get user friends" },
    }
  );
