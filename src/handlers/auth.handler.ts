import { Elysia, t } from "elysia";
import { authPlugin, createAccessToken } from "@/plugins/auth.plugin";
import { AuthService } from "@/services/auth.service";
import { LocationService } from "@/services/location.service";
import {
  authIdentifierBody,
  codeBody,
  passwordBody,
  resetCodeBody,
  usernameBody,
} from "@/lib/validation";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export const authHandler = new Elysia({ prefix: "/auth", tags: ["Auth"] })
  .use(authPlugin)
  .post(
    "/email/start",
    async ({ body, set }) => {
      const limit = await rateLimit({
        scope: "auth-email-start",
        identity: body.identifier,
        limit: 5,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      const result = await AuthService.startEmailSession(body.identifier);
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "User not found" };
      }
      return result;
    },
    {
      body: t.Object({ identifier: authIdentifierBody }),
      detail: {
        summary: "Start email verification session",
        description:
          "Creates a 10-minute auth session and sends a 6-digit code to email. Identifier can be email or existing username.",
      },
    }
  )
  .post(
    "/email/verify",
    async ({ body, set }) => {
      const limit = await rateLimit({
        scope: "auth-email-verify",
        identity: body.sessionId,
        limit: 10,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      const result = await AuthService.verifyEmailCode(body);
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Session not found or expired" };
      }
      if (result.error === "invalid_code") {
        set.status = 401;
        return { error: "Invalid verification code" };
      }
      return result;
    },
    {
      body: t.Object({
        sessionId: t.String(),
        code: codeBody,
      }),
      detail: {
        summary: "Verify email code",
        description: "Verifies the 6-digit email code for an auth session.",
      },
    }
  )
  .post(
    "/password/setup",
    async ({ body, jwt, set }) => {
      const limit = await rateLimit({
        scope: "auth-password-setup",
        identity: body.sessionId,
        limit: 5,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      const result = await AuthService.setupPassword(body);
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Session not found or expired" };
      }
      if (result.error === "username_taken") {
        set.status = 409;
        return { error: "Username is already taken" };
      }
      const accessToken = await createAccessToken(jwt, result.userId);

      return {
        user: result.user,
        accessToken,
        refreshToken: result.refreshToken,
      };
    },
    {
      body: t.Object({
        sessionId: t.String(),
        username: usernameBody,
        password: passwordBody,
      }),
      detail: {
        summary: "Set password after email verification",
      },
    }
  )
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      const limit = await rateLimit({
        scope: "auth-password-login",
        identity: body.identifier,
        limit: 10,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      const result = await AuthService.loginWithPassword(body);
      if (
        result.error === "not_found" ||
        result.error === "invalid_credentials"
      ) {
        set.status = 401;
        return { error: "Invalid credentials" };
      }

      const accessToken = await createAccessToken(jwt, result.userId);
      return {
        user: result.user,
        accessToken,
        refreshToken: result.refreshToken,
      };
    },
    {
      body: t.Object({
        identifier: authIdentifierBody,
        password: passwordBody,
      }),
      detail: { summary: "Login with email or username and password" },
    }
  )
  .post(
    "/password/reset/request",
    async ({ body, set }) => {
      const limit = await rateLimit({
        scope: "auth-password-reset-request",
        identity: body.identifier,
        limit: 5,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      return AuthService.startPasswordReset(body.identifier);
    },
    {
      body: t.Object({ identifier: authIdentifierBody }),
      detail: {
        summary: "Request password reset link",
        description:
          "Sends a one-time password reset link to the account email if the user exists.",
      },
    }
  )
  .post(
    "/password/reset/confirm",
    async ({ body, jwt, set }) => {
      const limit = await rateLimit({
        scope: "auth-password-reset-confirm",
        identity: body.sessionId,
        limit: 10,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      const result = await AuthService.resetPassword(body);
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Password reset session not found or expired" };
      }
      if (result.error === "invalid_code") {
        set.status = 401;
        return { error: "Invalid password reset code" };
      }

      const refreshToken = await AuthService.createRefreshToken(result.userId);
      const accessToken = await createAccessToken(jwt, result.userId);
      return {
        user: result.user,
        accessToken,
        refreshToken,
      };
    },
    {
      body: t.Object({
        sessionId: t.String(),
        code: resetCodeBody,
        password: passwordBody,
      }),
      detail: { summary: "Confirm password reset with link code" },
    }
  )
  .get(
    "/session/:sessionId",
    async ({ params: { sessionId }, set }) => {
      const result = await AuthService.getSessionStatus(sessionId);
      if (result.error === "not_found") {
        set.status = 404;
        return { error: "Session not found or expired" };
      }
      return result;
    },
    {
      params: t.Object({ sessionId: t.String() }),
      detail: { summary: "Get email auth session status" },
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
