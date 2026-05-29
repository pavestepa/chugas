import { Elysia, t } from "elysia";
import { env } from "@/config/env";
import { authPlugin, createAccessToken } from "@/plugins/auth.plugin";
import { AuthService } from "@/services/auth.service";
import { LocationService } from "@/services/location.service";
import { codeBody, usernameBody } from "@/lib/validation";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export const authHandler = new Elysia({ prefix: "/auth", tags: ["Auth"] })
  .use(authPlugin)
  .post(
    "/register",
    async ({ body, set }) => {
      const limit = await rateLimit({
        scope: "auth-register",
        identity: body.username,
        limit: 5,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      const result = await AuthService.startRegister(body.username);
      if (result.error === "username_taken") {
        set.status = 409;
        return { error: "Username is already taken" };
      }
      return result;
    },
    {
      body: t.Object({ username: usernameBody }),
      detail: {
        summary: "Start registration with username",
        description:
          "Returns verification code and sessionId. User sends code to Telegram bot, then app polls /auth/session/:sessionId",
      },
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      const limit = await rateLimit({
        scope: "auth-login",
        identity: body.username,
        limit: 5,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      const result = await AuthService.startLogin(body.username);
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "User not found" };
      }
      return result;
    },
    {
      body: t.Object({ username: usernameBody }),
      detail: {
        summary: "Start login with username",
        description:
          "Returns verification code and sessionId. User sends code to Telegram bot, then app polls /auth/session/:sessionId",
      },
    }
  )
  .get(
    "/session/:sessionId",
    async ({ params: { sessionId }, set }) => {
      const limit = await rateLimit({
        scope: "auth-session",
        identity: sessionId,
        limit: 30,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      const result = await AuthService.getSessionStatus(sessionId);
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Session not found or expired" };
      }
      return result;
    },
    {
      params: t.Object({ sessionId: t.String() }),
      detail: { summary: "Poll auth session until tokens are ready" },
    }
  )
  .post(
    "/telegram/verify",
    async ({ body, headers, jwt, set }) => {
      const limit = await rateLimit({
        scope: "auth-code",
        identity: body.telegramId,
        limit: 10,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      if (headers["x-bot-secret"] !== env.authBotSecret) {
        set.status = 403;
        return { error: "Forbidden" };
      }

      const result = await AuthService.verifyTelegramCode(body);
      if (result.error === "invalid_code") {
        set.status = 401;
        return { error: "Invalid verification code" };
      }
      if (result.error === "username_taken") {
        set.status = 409;
        return { error: "Username is already taken" };
      }
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "User not found" };
      }
      if (result.error === "telegram_linked") {
        set.status = 409;
        return { error: "Telegram account is linked to another user" };
      }

      const refreshToken = await AuthService.createRefreshToken(result.userId);
      const accessToken = await createAccessToken(jwt, result.userId);
      await AuthService.completeSession(result.sessionId, {
        user: result.user,
        accessToken,
        refreshToken,
      });

      return { success: true, username: result.user.username };
    },
    {
      body: t.Object({
        code: codeBody,
        telegramId: t.String(),
        telegramUsername: t.Optional(t.String()),
      }),
      detail: {
        summary: "Verify code from Telegram bot (internal)",
        description: "Requires X-Bot-Secret header",
      },
    }
  )
  .post(
    "/refresh",
    async ({ body, jwt, set }) => {
      const result = await AuthService.rotateRefreshToken(body.refreshToken);
      if (!result) {
        set.status = 401;
        return { error: "Invalid refresh token" };
      }
      const accessToken = await createAccessToken(jwt, result.userId);
      return {
        user: result.user,
        accessToken,
        refreshToken: result.refreshToken,
      };
    },
    {
      body: t.Object({ refreshToken: t.String() }),
      detail: { summary: "Refresh access token" },
    }
  )
  .post(
    "/logout",
    async ({ body, userId }) => {
      await AuthService.revokeRefreshToken(body.refreshToken);
      if (userId) {
        await LocationService.flush(userId);
      }
      return { success: true };
    },
    {
      body: t.Object({ refreshToken: t.String() }),
      detail: { summary: "Logout and flush location" },
    }
  );
