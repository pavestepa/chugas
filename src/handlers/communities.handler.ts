import { getUserId } from "@/lib/auth";
import { Elysia, t } from "elysia";
import { isDuplicateKeyError } from "@/lib/errors";
import { authPlugin } from "@/plugins/auth.plugin";
import { CommunitiesService } from "@/services/communities.service";
import { PostsService } from "@/services/posts.service";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export const communitiesHandler = new Elysia({
  prefix: "/communities",
  tags: ["Communities"],
})
  .use(authPlugin)
  .post(
    "/",
    ({ userId, body }) =>
      CommunitiesService.create({
        nickname: body.nickname,
        title: body.title,
        ownerId: getUserId(userId),
        access: body.access,
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      }),
    {
      auth: true,
      body: t.Object({
        nickname: t.String({
          minLength: 3,
          maxLength: 32,
          pattern: "^[a-zA-Z0-9_]+$",
        }),
        title: t.String({ minLength: 1, maxLength: 120 }),
        access: t.Union([t.Literal("open"), t.Literal("closed")]),
        description: t.Optional(t.String({ maxLength: 2000 })),
        bio: t.Optional(t.String({ maxLength: 2000 })),
        avatarUrl: t.Optional(t.String()),
      }),
      detail: { summary: "Create community" },
    }
  )
  .get(
    "/:id",
    async ({ params: { id }, set }) => {
      const community = await CommunitiesService.findById(id);
      if (!community) {
        set.status = 404;
        return { error: "Community not found" };
      }
      return community;
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { summary: "Get community" },
    }
  )
  .patch(
    "/:id",
    async ({ params: { id }, userId, body, set }) => {
      const result = await CommunitiesService.update(id, getUserId(userId), {
        ...(body.nickname !== undefined ? { nickname: body.nickname } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
        ...(body.access !== undefined ? { access: body.access } : {}),
      });

      if (result.error === "forbidden") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      if (result.error === "owner_required") {
        set.status = 403;
        return { error: "Only owner can change community nickname or access" };
      }
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Community not found" };
      }

      return result.community;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        nickname: t.Optional(
          t.String({
            minLength: 3,
            maxLength: 32,
            pattern: "^[a-zA-Z0-9_]+$",
          })
        ),
        title: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
        description: t.Optional(t.String({ maxLength: 2000 })),
        bio: t.Optional(t.String({ maxLength: 2000 })),
        avatarUrl: t.Optional(t.String()),
        access: t.Optional(t.Union([t.Literal("open"), t.Literal("closed")])),
      }),
      detail: { summary: "Update community" },
    }
  )
  .post(
    "/:id/join",
    async ({ params: { id }, userId, set }) => {
      try {
        const currentUserId = getUserId(userId);
        const limit = await rateLimit({
          scope: "community-request",
          identity: currentUserId,
          limit: 20,
          windowSeconds: 60,
        });
        if (!limit.allowed) {
          set.status = 429;
          return rateLimitedResponse(limit.resetInSeconds);
        }

        const result = await CommunitiesService.join(id, currentUserId);
        if (result.error === "not_found") {
          set.status = 404;
          return { error: "Community not found" };
        }
        if (result.error === "already_member") {
          set.status = 409;
          return { error: "Already a member" };
        }
        return result;
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          set.status = 409;
          return { error: "Already a member" };
        }
        throw error;
      }
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Join community" },
    }
  )
  .post(
    "/:id/leave",
    async ({ params: { id }, userId, set }) => {
      const result = await CommunitiesService.leave(id, getUserId(userId));
      if (result.error === "owner_cannot_leave") {
        set.status = 400;
        return { error: "Owner cannot leave community" };
      }
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Membership not found" };
      }
      return { success: true };
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Leave community" },
    }
  )
  .delete(
    "/:id",
    async ({ params: { id }, userId, set }) => {
      const result = await CommunitiesService.deleteCommunity(
        id,
        getUserId(userId)
      );
      if (result.error === "forbidden") {
        set.status = 403;
        return { error: "Only owner can delete community" };
      }
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Community not found" };
      }
      set.status = 204;
      return null;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Delete community" },
    }
  )
  .get(
    "/:id/posts",
    ({ params: { id }, query, userId }) =>
      PostsService.communityPosts(id, getUserId(userId), query),
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      query: t.Object({
        lng: t.Number({ minimum: -180, maximum: 180 }),
        lat: t.Number({ minimum: -90, maximum: 90 }),
      }),
      detail: { summary: "Get readable community posts within 500m" },
    }
  )
  .delete(
    "/:id/posts/:postId",
    async ({ params: { id, postId }, userId, set }) => {
      const result = await CommunitiesService.deletePost(
        id,
        postId,
        getUserId(userId)
      );
      if (result.error === "forbidden") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Post not found" };
      }
      set.status = 204;
      return null;
    },
    {
      auth: true,
      params: t.Object({ id: t.String(), postId: t.String() }),
      detail: { summary: "Delete community post as moderator" },
    }
  )
  .post(
    "/:id/bans/:userId",
    async ({ params: { id, userId: targetUserId }, userId, body, set }) => {
      const result = await CommunitiesService.banUser(
        id,
        targetUserId,
        getUserId(userId),
        body.reason
      );
      if (result.error === "forbidden") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      if (result.error === "cannot_ban_owner") {
        set.status = 400;
        return { error: "Community owner cannot be banned" };
      }
      if (result.error === "cannot_ban_moderator") {
        set.status = 400;
        return { error: "Only owner can ban moderators" };
      }
      return result.ban;
    },
    {
      auth: true,
      params: t.Object({ id: t.String(), userId: t.String() }),
      body: t.Object({
        reason: t.Optional(t.String({ maxLength: 500 })),
      }),
      detail: { summary: "Ban user from community" },
    }
  )
  .delete(
    "/:id/bans/:userId",
    async ({ params: { id, userId: targetUserId }, userId, set }) => {
      const result = await CommunitiesService.unbanUser(
        id,
        targetUserId,
        getUserId(userId)
      );
      if (result.error === "forbidden") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Ban not found" };
      }
      return { success: true };
    },
    {
      auth: true,
      params: t.Object({ id: t.String(), userId: t.String() }),
      detail: { summary: "Unban user from community" },
    }
  )
  .get(
    "/:id/bans",
    async ({ params: { id }, userId, set }) => {
      const result = await CommunitiesService.bans(id, getUserId(userId));
      if (result.error === "forbidden") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      return result.bans;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "List community bans" },
    }
  )
  .get(
    "/:id/map-posts",
    ({ params: { id }, userId }) =>
      PostsService.communityMapPoints(id, getUserId(userId)),
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Get community post map points" },
    }
  )
  .get(
    "/:id/requests",
    async ({ params: { id }, userId, set }) => {
      const result = await CommunitiesService.requests(id, getUserId(userId));
      if (result.error === "forbidden") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      return result.requests;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Get community join requests" },
    }
  )
  .post(
    "/:id/requests/:requestId/accept",
    async ({ params: { id, requestId }, userId, set }) => {
      const result = await CommunitiesService.acceptRequest(
        id,
        requestId,
        getUserId(userId)
      );
      if (result.error === "forbidden") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Community request not found" };
      }
      return result;
    },
    {
      auth: true,
      params: t.Object({ id: t.String(), requestId: t.String() }),
      detail: { summary: "Accept community join request" },
    }
  )
  .post(
    "/:id/requests/:requestId/reject",
    async ({ params: { id, requestId }, userId, set }) => {
      const result = await CommunitiesService.rejectRequest(
        id,
        requestId,
        getUserId(userId)
      );
      if (result.error === "forbidden") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Community request not found" };
      }
      return result.request;
    },
    {
      auth: true,
      params: t.Object({ id: t.String(), requestId: t.String() }),
      detail: { summary: "Reject community join request" },
    }
  )
  .post(
    "/:id/moderators/:userId",
    async ({ params: { id, userId: targetUserId }, userId, set }) => {
      const result = await CommunitiesService.addModerator(
        id,
        targetUserId,
        getUserId(userId)
      );
      if (result.error === "forbidden") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Community member not found" };
      }
      return result;
    },
    {
      auth: true,
      params: t.Object({ id: t.String(), userId: t.String() }),
      detail: { summary: "Add community moderator" },
    }
  )
  .delete(
    "/:id/moderators/:userId",
    async ({ params: { id, userId: targetUserId }, userId, set }) => {
      const result = await CommunitiesService.removeModerator(
        id,
        targetUserId,
        getUserId(userId)
      );
      if (result.error === "forbidden") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Community moderator not found" };
      }
      return result;
    },
    {
      auth: true,
      params: t.Object({ id: t.String(), userId: t.String() }),
      detail: { summary: "Remove community moderator" },
    }
  );
