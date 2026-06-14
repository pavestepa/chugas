import { getUserId } from "@/lib/auth";
import { Elysia, t } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { FollowsService } from "@/services/follows.service";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export const followsHandler = new Elysia({ tags: ["Follows"] })
  .use(authPlugin)
  .post(
    "/users/:id/follow",
    async ({ params: { id }, userId, set }) => {
      const currentUserId = getUserId(userId);
      const limit = await rateLimit({
        scope: "follow",
        identity: currentUserId,
        limit: 60,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      const result = await FollowsService.follow(currentUserId, id);
      if ("error" in result) {
        if (result.error === "self_follow") {
          set.status = 400;
          return { error: "Cannot follow yourself" };
        }

        if (result.error === "not_found") {
          set.status = 404;
          return { error: "User not found" };
        }

        if (result.error === "blocked") {
          set.status = 403;
          return { error: "Follow is blocked" };
        }

        if (result.error === "already_following") {
          set.status = 409;
          return { error: "Already following user" };
        }

        set.status = 409;
        return {
          error: "Follow request already exists",
          request: result.request,
        };
      }

      if ("request" in result) {
        set.status = 201;
        return result.request;
      }

      return result.follow;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: {
        summary: "Follow user or request follow",
        description:
          "For open accounts creates an immediate follow. For closed accounts creates a pending follow request that must be accepted.",
      },
    }
  )
  .delete(
    "/users/:id/follow",
    async ({ params: { id }, userId, set }) => {
      const currentUserId = getUserId(userId);

      if (await FollowsService.unfollow(currentUserId, id)) {
        set.status = 204;
        return null;
      }

      if (await FollowsService.cancelRequest(currentUserId, id)) {
        set.status = 204;
        return null;
      }

      set.status = 404;
      return { error: "Follow or follow request not found" };
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: {
        summary: "Unfollow user or cancel follow request",
        description:
          "Removes an active follow. If no follow exists, cancels a pending outgoing follow request to the user.",
      },
    }
  )
  .get(
    "/follow-requests",
    ({ userId }) => FollowsService.incomingRequests(getUserId(userId)),
    {
      auth: true,
      detail: { summary: "Get incoming follow requests" },
    }
  )
  .get(
    "/follow-requests/sent",
    ({ userId }) => FollowsService.outgoingRequests(getUserId(userId)),
    {
      auth: true,
      detail: { summary: "Get outgoing follow requests" },
    }
  )
  .post(
    "/follow-requests/:id/accept",
    async ({ params: { id }, userId, set }) => {
      const result = await FollowsService.acceptRequest(id, getUserId(userId));
      if (result && "error" in result) {
        set.status = 403;
        return { error: "Follow request is blocked" };
      }
      if (!result) {
        set.status = 404;
        return { error: "Follow request not found" };
      }

      return result;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Accept follow request" },
    }
  )
  .post(
    "/follow-requests/:id/reject",
    async ({ params: { id }, userId, set }) => {
      const request = await FollowsService.rejectRequest(id, getUserId(userId));
      if (!request) {
        set.status = 404;
        return { error: "Follow request not found" };
      }

      return request;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Reject follow request" },
    }
  )
  .get(
    "/users/:id/followers",
    ({ params: { id } }) => FollowsService.followers(id),
    {
      params: t.Object({ id: t.String() }),
      detail: { summary: "Get user followers" },
    }
  )
  .get(
    "/users/:id/following",
    ({ params: { id } }) => FollowsService.following(id),
    {
      params: t.Object({ id: t.String() }),
      detail: { summary: "Get users followed by user" },
    }
  );
