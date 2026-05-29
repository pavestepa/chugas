import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { env } from "@/config/env";

export const authPlugin = new Elysia({ name: "auth" })
  .use(
    jwt({
      name: "jwt",
      secret: env.jwtSecret,
      exp: env.jwtExpiresIn,
    })
  )
  .derive({ as: "global" }, async ({ jwt: jwtPlugin, headers }) => {
    const authorization = headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      return { userId: null as string | null };
    }

    const payload = await jwtPlugin.verify(authorization.slice(7));
    if (!payload || typeof payload.sub !== "string") {
      return { userId: null as string | null };
    }

    return { userId: payload.sub };
  })
  .macro("auth", {
    beforeHandle({ userId, set }) {
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return;
    },
  });

export async function createAccessToken(
  jwtPlugin: { sign: (payload: { sub: string }) => Promise<string> },
  userId: string
) {
  return jwtPlugin.sign({ sub: userId });
}
