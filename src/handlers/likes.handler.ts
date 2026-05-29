import { getUserId } from "@/lib/auth";
import { Elysia, t } from "elysia";
import { isDuplicateKeyError } from "@/lib/errors";
import { authPlugin } from "@/plugins/auth.plugin";
import { LikesService } from "@/services/likes.service";

export const likesHandler = new Elysia({ tags: ["Likes"] })
  .use(authPlugin)
  .post(
    "/posts/:id/like",
    async ({ params: { id }, userId, set }) => {
      try {
        return await LikesService.like(id, getUserId(userId));
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          set.status = 409;
          return { error: "Already liked" };
        }
        throw error;
      }
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Like post" },
    }
  )
  .delete(
    "/posts/:id/like",
    async ({ params: { id }, userId, set }) => {
      if (!(await LikesService.unlike(id, getUserId(userId)))) {
        set.status = 404;
        return { error: "Like not found" };
      }
      set.status = 204;
      return null;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Unlike post" },
    }
  );
