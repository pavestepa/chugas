import { getUserId } from "@/lib/auth";
import { Elysia, t } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { CommentsService } from "@/services/comments.service";

export const commentsHandler = new Elysia({ tags: ["Comments"] })
  .use(authPlugin)
  .post(
    "/posts/:id/comments",
    ({ params: { id }, userId, body }) =>
      CommentsService.create({
        postId: id,
        authorId: getUserId(userId),
        text: body.text,
      }),
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        text: t.String({ minLength: 1, maxLength: 2000 }),
      }),
      detail: { summary: "Create comment" },
    }
  )
  .get(
    "/posts/:id/comments",
    ({ params: { id } }) => CommentsService.listByPost(id),
    {
      params: t.Object({ id: t.String() }),
      detail: { summary: "List post comments" },
    }
  )
  .delete(
    "/comments/:id",
    async ({ params: { id }, userId, set }) => {
      if (!(await CommentsService.delete(id, getUserId(userId)))) {
        set.status = 404;
        return { error: "Comment not found" };
      }
      set.status = 204;
      return null;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Delete comment" },
    }
  );
