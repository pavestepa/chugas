import { getUserId } from "@/lib/auth";
import { Elysia, t } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import type { Coordinates } from "../lib/geo";
import { PostsService } from "../services/posts.service";
import { locationBody, locationQuery, mediaBody } from "@/lib/validation";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit";

function coordinatesFromQuery({ lng, lat }: Coordinates): Coordinates {
  return { lng, lat };
}

export const postsHandler = new Elysia({ prefix: "/posts", tags: ["Posts"] })
  .use(authPlugin)
  .post(
    "/",
    async ({ userId, body, set }) => {
      const currentUserId = getUserId(userId);
      const limit = await rateLimit({
        scope: "post-create",
        identity: currentUserId,
        limit: 20,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      const result = await PostsService.create({
        authorId: currentUserId,
        type: body.type,
        text: body.text,
        ...(body.media !== undefined ? { media: body.media } : {}),
        ...(body.communityId !== undefined
          ? { communityId: body.communityId }
          : {}),
        location: body.location,
      });

      if ("error" in result && result.error === "community_required") {
        set.status = 400;
        return { error: "communityId is required for community posts" };
      }

      if ("error" in result) {
        set.status = 403;
        return { error: "Only community members can post here" };
      }

      return result;
    },
    {
      auth: true,
      body: t.Object({
        type: t.Union([
          t.Literal("public"),
          t.Literal("followers"),
          t.Literal("community"),
        ]),
        text: t.String({ minLength: 1, maxLength: 5000 }),
        media: t.Optional(t.Array(mediaBody)),
        communityId: t.Optional(t.String()),
        location: locationBody,
      }),
      detail: { summary: "Create post" },
    }
  )
  .get(
    "/:id",
    async ({ params: { id }, query, userId, set }) => {
      const result = await PostsService.findReadableById(
        id,
        getUserId(userId),
        coordinatesFromQuery(query)
      );
      if ("error" in result) {
        if (result.error === "not_found") {
          set.status = 404;
          return { error: "Post not found" };
        }

        if (result.error === "too_far") {
          set.status = 403;
          return {
            error: "Post is outside readable radius",
            point: result.point,
          };
        }

        set.status = 403;
        return { error: "Forbidden" };
      }

      return result.post;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      query: locationQuery,
      detail: { summary: "Get post" },
    }
  )
  .delete(
    "/:id",
    async ({ params: { id }, userId, set }) => {
      if (!(await PostsService.delete(id, getUserId(userId)))) {
        set.status = 404;
        return { error: "Post not found" };
      }
      set.status = 204;
      return null;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Delete post" },
    }
  );

export const feedHandler = new Elysia({ tags: ["Posts"] })
  .use(authPlugin)
  .get("/feed", ({ userId }) => PostsService.feed(getUserId(userId)), {
    auth: true,
    detail: { summary: "Get feed" },
  });
