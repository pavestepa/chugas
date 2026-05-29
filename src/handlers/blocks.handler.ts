import { getUserId } from "@/lib/auth";
import { Elysia, t } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { BlocksService } from "@/services/blocks.service";

export const blocksHandler = new Elysia({ tags: ["Blocks"] })
  .use(authPlugin)
  .post(
    "/users/:id/block",
    async ({ params: { id }, userId, set }) => {
      const result = await BlocksService.block(getUserId(userId), id);
      if (result.error === "self_block") {
        set.status = 400;
        return { error: "Cannot block yourself" };
      }

      return result.block;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Block user" },
    }
  )
  .delete(
    "/users/:id/block",
    async ({ params: { id }, userId, set }) => {
      if (!(await BlocksService.unblock(getUserId(userId), id))) {
        set.status = 404;
        return { error: "Block not found" };
      }

      set.status = 204;
      return null;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      detail: { summary: "Unblock user" },
    }
  )
  .get(
    "/blocks",
    ({ userId }) => BlocksService.blockedUsers(getUserId(userId)),
    {
      auth: true,
      detail: { summary: "List blocked users" },
    }
  );
