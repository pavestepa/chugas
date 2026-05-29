import { getUserId } from "@/lib/auth";
import { Elysia, t } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { UsersService } from "@/services/users.service";

export const usersHandler = new Elysia({ prefix: "/users", tags: ["Users"] })
  .use(authPlugin)
  .get("/search", ({ query }) => UsersService.search(query.q), {
    query: t.Object({ q: t.String({ minLength: 1 }) }),
    detail: { summary: "Search users" },
  })
  .get(
    "/:id",
    async ({ params: { id }, set }) => {
      const user = await UsersService.findById(id);
      if (!user) {
        set.status = 404;
        return { error: "User not found" };
      }
      return user;
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { summary: "Get user by id" },
    }
  )
  .patch(
    "/me",
    async ({ userId, body, set }) => {
      const user = await UsersService.updateMe(getUserId(userId), body);
      if (!user) {
        set.status = 404;
        return { error: "User not found" };
      }
      return user;
    },
    {
      auth: true,
      body: t.Object({
        username: t.Optional(t.String({ minLength: 3, maxLength: 32 })),
        avatarUrl: t.Optional(t.String()),
        bio: t.Optional(t.String({ maxLength: 500 })),
      }),
      detail: { summary: "Update current user" },
    }
  );
