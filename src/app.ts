import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { authHandler } from "@/handlers/auth.handler";
import { blocksHandler } from "@/handlers/blocks.handler";
import { commentsHandler } from "@/handlers/comments.handler";
import { communitiesHandler } from "@/handlers/communities.handler";
import { feedHandler, postsHandler } from "@/handlers/posts.handler";
import { friendsHandler } from "@/handlers/friends.handler";
import { likesHandler } from "@/handlers/likes.handler";
import { locationHandler } from "@/handlers/location.handler";
import { mapHandler } from "@/handlers/map.handler";
import { messagesHandler } from "@/handlers/messages.handler";
import { errorsPlugin } from "@/plugins/errors.plugin";
import { loggerPlugin } from "@/plugins/logger.plugin";
import { usersHandler } from "@/handlers/users.handler";
import { wsHandler } from "@/handlers/ws.handler";

export const app = new Elysia()
  .use(loggerPlugin)
  .use(errorsPlugin)
  .use(
    openapi({
      documentation: {
        info: {
          title: "irlgram API",
          version: "1.0.0",
          description:
            "Social API with auth, posts, communities, chat and geolocation",
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      provider: "swagger-ui",
      path: "/swagger",
    })
  )
  .get("/", () => ({ name: "irlgram", status: "ok", docs: "/swagger" }))
  .use(authHandler)
  .use(usersHandler)
  .use(blocksHandler)
  .use(friendsHandler)
  .use(postsHandler)
  .use(feedHandler)
  .use(commentsHandler)
  .use(likesHandler)
  .use(communitiesHandler)
  .use(mapHandler)
  .use(messagesHandler)
  .use(locationHandler)
  .use(wsHandler);
