import { createHash, randomInt, randomUUID } from "node:crypto";
import { env } from "@/config/env";
import { authSessionKey, refreshTokenKey, redis } from "@/db/redis";
import { sendAuthCodeEmail, sendPasswordResetEmail } from "@/lib/mailer";
import { normalizeEmail, normalizeUsername } from "@/lib/validation";
import { toUserJson, UserModel } from "@/schemas/user.schema";

type AuthMode = "register" | "password_setup" | "password_reset";

interface AuthSession {
  sessionId: string;
  email: string;
  codeHash: string;
  mode: AuthMode;
  userId?: string;
  status: "pending" | "email_verified" | "completed";
  user?: ReturnType<typeof toUserJson>;
  accessToken?: string;
  refreshToken?: string;
}

function generateCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

function generateResetCode(): string {
  return randomUUID().replaceAll("-", "");
}

function isEmail(identifier: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
}

function codeHash(sessionId: string, code: string): string {
  return createHash("sha256")
    .update(`${sessionId}:${code}:${env.jwtSecret}`)
    .digest("hex");
}

function passwordResetLink(sessionId: string, code: string): string {
  const url = new URL(env.passwordResetUrl);
  url.searchParams.set("sessionId", sessionId);
  url.searchParams.set("code", code);
  return url.toString();
}

async function saveSession(session: AuthSession) {
  await redis.setex(
    authSessionKey(session.sessionId),
    env.authSessionExpiresInSeconds,
    JSON.stringify(session)
  );
}

async function getSession(sessionId: string): Promise<AuthSession | null> {
  const raw = await redis.get(authSessionKey(sessionId));
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as AuthSession;
}

export const AuthService = {
  startEmailSession: async (identifier: string) => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const existingUser = isEmail(normalizedIdentifier)
      ? await UserModel.findOne({ email: normalizeEmail(normalizedIdentifier) })
      : await UserModel.findOne({
          username: normalizeUsername(normalizedIdentifier),
        });

    if (!existingUser && !isEmail(normalizedIdentifier)) {
      return { error: "not_found" as const };
    }

    const sessionId = randomUUID();
    const code = generateCode();
    const session: AuthSession = {
      sessionId,
      email: existingUser
        ? String(existingUser.email)
        : normalizeEmail(normalizedIdentifier),
      codeHash: codeHash(sessionId, code),
      mode: existingUser ? "password_setup" : "register",
      ...(existingUser ? { userId: existingUser._id.toString() } : {}),
      status: "pending",
    };

    await saveSession(session);
    await sendAuthCodeEmail(session.email, code);

    return {
      sessionId,
      expiresIn: env.authSessionExpiresInSeconds,
      email: session.email,
      status: session.status,
    };
  },

  verifyEmailCode: async (input: { sessionId: string; code: string }) => {
    const session = await getSession(input.sessionId);
    if (session?.status !== "pending") {
      return { error: "not_found" as const };
    }

    if (session.codeHash !== codeHash(session.sessionId, input.code)) {
      return { error: "invalid_code" as const };
    }

    session.status = "email_verified";
    await saveSession(session);

    return {
      sessionId: session.sessionId,
      email: session.email,
      mode: session.mode,
      status: session.status,
    };
  },

  setupPassword: async (input: {
    sessionId: string;
    username: string;
    password: string;
  }) => {
    const session = await getSession(input.sessionId);
    if (session?.status !== "email_verified") {
      return { error: "not_found" as const };
    }

    const username = normalizeUsername(input.username);
    const passwordHash = await Bun.password.hash(input.password, {
      algorithm: "argon2id",
    });

    const existingByUsername = await UserModel.findOne({ username });
    if (
      existingByUsername &&
      existingByUsername._id.toString() !== session.userId
    ) {
      return { error: "username_taken" as const };
    }

    const user =
      session.userId !== undefined
        ? await UserModel.findByIdAndUpdate(
            session.userId,
            { passwordHash, username },
            { new: true, runValidators: true }
          )
        : await UserModel.create({
            email: session.email,
            username,
            passwordHash,
          });

    if (!user) {
      return { error: "not_found" as const };
    }

    const refreshToken = await AuthService.createRefreshToken(
      user._id.toString()
    );

    session.status = "completed";
    session.user = toUserJson(user);
    session.refreshToken = refreshToken;
    await saveSession(session);
    await redis.del(authSessionKey(session.sessionId));

    return {
      user: toUserJson(user),
      userId: user._id.toString(),
      refreshToken,
    };
  },

  loginWithPassword: async (input: {
    identifier: string;
    password: string;
  }) => {
    const identifier = input.identifier.trim().toLowerCase();
    const user = isEmail(identifier)
      ? await UserModel.findOne({ email: normalizeEmail(identifier) })
      : await UserModel.findOne({ username: normalizeUsername(identifier) });

    if (!user) {
      return { error: "not_found" as const };
    }

    const verified = await Bun.password.verify(
      input.password,
      String(user.passwordHash)
    );
    if (!verified) {
      return { error: "invalid_credentials" as const };
    }

    const refreshToken = await AuthService.createRefreshToken(
      user._id.toString()
    );

    return {
      user: toUserJson(user),
      userId: user._id.toString(),
      refreshToken,
    };
  },

  startPasswordReset: async (identifier: string) => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const user = isEmail(normalizedIdentifier)
      ? await UserModel.findOne({ email: normalizeEmail(normalizedIdentifier) })
      : await UserModel.findOne({
          username: normalizeUsername(normalizedIdentifier),
        });

    if (user) {
      const sessionId = randomUUID();
      const code = generateResetCode();
      const session: AuthSession = {
        sessionId,
        email: String(user.email),
        codeHash: codeHash(sessionId, code),
        mode: "password_reset",
        userId: user._id.toString(),
        status: "pending",
      };

      await saveSession(session);
      await sendPasswordResetEmail(
        session.email,
        passwordResetLink(sessionId, code)
      );
    }

    return {
      sent: true as const,
      expiresIn: env.authSessionExpiresInSeconds,
    };
  },

  resetPassword: async (input: {
    sessionId: string;
    code: string;
    password: string;
  }) => {
    const session = await getSession(input.sessionId);
    if (session?.status !== "pending" || session.mode !== "password_reset") {
      return { error: "not_found" as const };
    }

    if (session.codeHash !== codeHash(session.sessionId, input.code)) {
      return { error: "invalid_code" as const };
    }

    if (!session.userId) {
      return { error: "not_found" as const };
    }

    const passwordHash = await Bun.password.hash(input.password, {
      algorithm: "argon2id",
    });
    const user = await UserModel.findByIdAndUpdate(
      session.userId,
      { passwordHash },
      { new: true, runValidators: true }
    );
    if (!user) {
      return { error: "not_found" as const };
    }

    await redis.del(authSessionKey(session.sessionId));

    return {
      user: toUserJson(user),
      userId: user._id.toString(),
    };
  },

  getSessionStatus: async (sessionId: string) => {
    const session = await getSession(sessionId);
    if (!session) {
      return { error: "not_found" as const };
    }

    return {
      status: session.status,
      email: session.email,
      mode: session.mode,
      expiresIn: env.authSessionExpiresInSeconds,
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
