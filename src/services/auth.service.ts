import { randomInt, randomUUID } from "node:crypto";
import { env } from "@/config/env";
import {
  authCodeKey,
  authSessionKey,
  refreshTokenKey,
  redis,
} from "@/db/redis";
import { normalizeUsername } from "@/lib/validation";
import { toUserJson, UserModel } from "@/schemas/user.schema";

type AuthMode = "register" | "login";

interface AuthSession {
  sessionId: string;
  username: string;
  code: string;
  mode: AuthMode;
  status: "pending" | "completed";
  user?: ReturnType<typeof toUserJson>;
  accessToken?: string;
  refreshToken?: string;
}

function generateCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

async function saveSession(session: AuthSession) {
  await redis.setex(
    authSessionKey(session.sessionId),
    env.authSessionExpiresInSeconds,
    JSON.stringify(session)
  );

  if (session.status === "pending") {
    await redis.setex(
      authCodeKey(session.code),
      env.authSessionExpiresInSeconds,
      session.sessionId
    );
  }
}

async function getSession(sessionId: string): Promise<AuthSession | null> {
  const raw = await redis.get(authSessionKey(sessionId));
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as AuthSession;
}

export const AuthService = {
  startRegister: async (username: string) => {
    const normalizedUsername = normalizeUsername(username);
    const existingUser = await UserModel.findOne({
      username: normalizedUsername,
    });
    if (existingUser) {
      return { error: "username_taken" as const };
    }

    const sessionId = randomUUID();
    const code = generateCode();
    const session: AuthSession = {
      sessionId,
      username: normalizedUsername,
      code,
      mode: "register",
      status: "pending",
    };

    await saveSession(session);

    return {
      sessionId,
      code,
      expiresIn: env.authSessionExpiresInSeconds,
      botUsername: env.telegramBotUsername,
      botLink: `https://t.me/${env.telegramBotUsername}`,
    };
  },

  startLogin: async (username: string) => {
    const normalizedUsername = normalizeUsername(username);
    const user = await UserModel.findOne({ username: normalizedUsername });
    if (!user) {
      return { error: "not_found" as const };
    }

    const sessionId = randomUUID();
    const code = generateCode();
    const session: AuthSession = {
      sessionId,
      username: normalizedUsername,
      code,
      mode: "login",
      status: "pending",
    };

    await saveSession(session);

    return {
      sessionId,
      code,
      expiresIn: env.authSessionExpiresInSeconds,
      botUsername: env.telegramBotUsername,
      botLink: `https://t.me/${env.telegramBotUsername}`,
    };
  },

  getSessionStatus: async (sessionId: string) => {
    const session = await getSession(sessionId);
    if (!session) {
      return { error: "not_found" as const };
    }

    if (session.status === "pending") {
      return {
        status: "pending" as const,
        username: session.username,
        mode: session.mode,
        expiresIn: env.authSessionExpiresInSeconds,
      };
    }

    return {
      status: "completed" as const,
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  },

  verifyTelegramCode: async (input: {
    code: string;
    telegramId: string;
    telegramUsername?: string;
  }) => {
    const sessionId = await redis.get(authCodeKey(input.code));
    if (!sessionId) {
      return { error: "invalid_code" as const };
    }

    const session = await getSession(sessionId);
    if (session?.status !== "pending" || session.code !== input.code) {
      return { error: "invalid_code" as const };
    }

    const telegramId = input.telegramId;
    const linkedUser = await UserModel.findOne({ telegramId });
    if (linkedUser && linkedUser.username !== session.username) {
      return { error: "telegram_linked" as const };
    }

    let user =
      session.mode === "register"
        ? await UserModel.findOne({ username: session.username })
        : await UserModel.findOne({ username: session.username });

    if (session.mode === "register") {
      if (user) {
        return { error: "username_taken" as const };
      }

      user = await UserModel.create({
        username: session.username,
        telegramId,
        telegramUsername: input.telegramUsername ?? "",
      });
    } else {
      if (!user) {
        return { error: "not_found" as const };
      }

      user.telegramId = telegramId;
      user.telegramUsername = input.telegramUsername ?? user.telegramUsername;
      await user.save();
    }

    await redis.del(authCodeKey(input.code));

    return {
      sessionId: session.sessionId,
      user: toUserJson(user),
      userId: user._id.toString(),
    };
  },

  completeSession: async (
    sessionId: string,
    data: {
      user: ReturnType<typeof toUserJson>;
      accessToken: string;
      refreshToken: string;
    }
  ) => {
    const session = await getSession(sessionId);
    if (!session) {
      return false;
    }

    session.status = "completed";
    session.user = data.user;
    session.accessToken = data.accessToken;
    session.refreshToken = data.refreshToken;
    await saveSession(session);
    await redis.del(authCodeKey(session.code));
    return true;
  },

  createRefreshToken: async (userId: string) => {
    const tokenId = randomUUID();
    await redis.setex(
      refreshTokenKey(tokenId),
      env.refreshExpiresInSeconds,
      userId
    );
    return tokenId;
  },

  revokeRefreshToken: async (tokenId: string) => {
    await redis.del(refreshTokenKey(tokenId));
  },

  rotateRefreshToken: async (tokenId: string) => {
    const userId = await redis.get(refreshTokenKey(tokenId));
    if (!userId) {
      return null;
    }

    await AuthService.revokeRefreshToken(tokenId);
    const newTokenId = await AuthService.createRefreshToken(userId);
    const user = await UserModel.findById(userId);
    if (!user) {
      return null;
    }

    return { user: toUserJson(user), userId, refreshToken: newTokenId };
  },
};
