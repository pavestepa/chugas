import { createHash, randomInt, randomUUID } from 'node:crypto';

import { hash } from '@node-rs/argon2';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { toUserJson } from '../../common/mappers/api-json.mapper';
import { MailService } from '../../common/services/mail.service';
import {
  isEmail,
  normalizeEmail,
  normalizeUsername,
} from '../../common/utils/validation.util';
import { isPrismaUniqueConstraintError } from '../../common/utils/prisma.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  authSessionKey,
  refreshTokenKey,
  RedisService,
} from '../../redis/redis.service';

type AuthMode = 'register' | 'password_setup' | 'password_reset';

interface AuthSession {
  sessionId: string;
  email: string;
  codeHash: string;
  mode: AuthMode;
  userId?: string;
  status: 'pending' | 'email_verified' | 'completed';
  user?: ReturnType<typeof toUserJson>;
  accessToken?: string;
  refreshToken?: string;
}

function generateCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

function generateResetCode(): string {
  return randomUUID().replaceAll('-', '');
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly authSessionExpiresInSeconds: number;
  private readonly refreshExpiresInSeconds: number;
  private readonly passwordResetUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mailService: MailService,
    configService: ConfigService,
  ) {
    this.jwtSecret = configService.getOrThrow<string>('jwtSecret');
    this.authSessionExpiresInSeconds = configService.getOrThrow<number>(
      'authSessionExpiresInSeconds',
    );
    this.refreshExpiresInSeconds = configService.getOrThrow<number>(
      'refreshExpiresInSeconds',
    );
    this.passwordResetUrl = configService.getOrThrow<string>('passwordResetUrl');
  }

  private codeHash(sessionId: string, code: string): string {
    return createHash('sha256')
      .update(`${sessionId}:${code}:${this.jwtSecret}`)
      .digest('hex');
  }

  private passwordResetLink(sessionId: string, code: string): string {
    const url = new URL(this.passwordResetUrl);
    url.searchParams.set('sessionId', sessionId);
    url.searchParams.set('code', code);
    return url.toString();
  }

  private async saveSession(session: AuthSession) {
    await this.redis.client.setex(
      authSessionKey(session.sessionId),
      this.authSessionExpiresInSeconds,
      JSON.stringify(session),
    );
  }

  private async getSession(sessionId: string): Promise<AuthSession | null> {
    const raw = await this.redis.client.get(authSessionKey(sessionId));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AuthSession;
  }

  async startEmailSession(identifier: string) {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const existingUser = isEmail(normalizedIdentifier)
      ? await this.prisma.user.findUnique({
          where: { email: normalizeEmail(normalizedIdentifier) },
        })
      : await this.prisma.user.findUnique({
          where: { username: normalizeUsername(normalizedIdentifier) },
        });

    if (!existingUser && !isEmail(normalizedIdentifier)) {
      return { error: 'not_found' as const };
    }

    const sessionId = randomUUID();
    const code = generateCode();
    const session: AuthSession = {
      sessionId,
      email: existingUser
        ? existingUser.email
        : normalizeEmail(normalizedIdentifier),
      codeHash: this.codeHash(sessionId, code),
      mode: existingUser ? 'password_setup' : 'register',
      ...(existingUser ? { userId: existingUser.id } : {}),
      status: 'pending',
    };

    await this.saveSession(session);
    await this.mailService.sendAuthCodeEmail(session.email, code);

    return {
      sessionId,
      expiresIn: this.authSessionExpiresInSeconds,
      email: session.email,
      status: session.status,
    };
  }

  async verifyEmailCode(input: { sessionId: string; code: string }) {
    const session = await this.getSession(input.sessionId);
    if (session?.status !== 'pending') {
      return { error: 'not_found' as const };
    }

    if (session.codeHash !== this.codeHash(session.sessionId, input.code)) {
      return { error: 'invalid_code' as const };
    }

    session.status = 'email_verified';
    await this.saveSession(session);

    return {
      sessionId: session.sessionId,
      email: session.email,
      mode: session.mode,
      status: session.status,
    };
  }

  async setupPassword(input: {
    sessionId: string;
    username: string;
    password: string;
  }) {
    const session = await this.getSession(input.sessionId);
    if (session?.status !== 'email_verified') {
      return { error: 'not_found' as const };
    }

    const username = normalizeUsername(input.username);
    const passwordHash = await hash(input.password);

    const existingByUsername = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingByUsername && existingByUsername.id !== session.userId) {
      return { error: 'username_taken' as const };
    }

    const user =
      session.userId !== undefined
        ? await this.prisma.user.update({
            where: { id: session.userId },
            data: { passwordHash, username },
          })
        : await this.prisma.user.create({
            data: { email: session.email, username, passwordHash },
          });

    const refreshToken = await this.createRefreshToken(user.id);

    session.status = 'completed';
    session.user = toUserJson(user);
    session.refreshToken = refreshToken;
    await this.saveSession(session);
    await this.redis.client.del(authSessionKey(session.sessionId));

    return {
      user: toUserJson(user),
      userId: user.id,
      refreshToken,
    };
  }

  async register(input: { email: string; username: string; password: string }) {
    const email = normalizeEmail(input.email);
    const username = normalizeUsername(input.username);

    const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return { error: 'email_taken' as const };
    }

    const existingByUsername = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingByUsername) {
      return { error: 'username_taken' as const };
    }

    const passwordHash = await hash(input.password);

    try {
      const user = await this.prisma.user.create({
        data: { email, username, passwordHash },
      });
      return { user: toUserJson(user) };
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        const target = (error as { meta?: { target?: string[] } }).meta?.target;
        if (target?.includes('email')) {
          return { error: 'email_taken' as const };
        }
        if (target?.includes('username')) {
          return { error: 'username_taken' as const };
        }
      }
      throw error;
    }
  }

  async loginWithPassword(input: { identifier: string; password: string }) {
    const { verify } = await import('@node-rs/argon2');
    const identifier = input.identifier.trim().toLowerCase();
    const user = isEmail(identifier)
      ? await this.prisma.user.findUnique({
          where: { email: normalizeEmail(identifier) },
        })
      : await this.prisma.user.findUnique({
          where: { username: normalizeUsername(identifier) },
        });

    if (!user) {
      return { error: 'not_found' as const };
    }

    const verified = await verify(user.passwordHash, input.password);
    if (!verified) {
      return { error: 'invalid_credentials' as const };
    }

    const refreshToken = await this.createRefreshToken(user.id);

    return {
      user: toUserJson(user),
      userId: user.id,
      refreshToken,
    };
  }

  async startPasswordReset(identifier: string) {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const user = isEmail(normalizedIdentifier)
      ? await this.prisma.user.findUnique({
          where: { email: normalizeEmail(normalizedIdentifier) },
        })
      : await this.prisma.user.findUnique({
          where: { username: normalizeUsername(normalizedIdentifier) },
        });

    if (user) {
      const sessionId = randomUUID();
      const code = generateResetCode();
      const session: AuthSession = {
        sessionId,
        email: user.email,
        codeHash: this.codeHash(sessionId, code),
        mode: 'password_reset',
        userId: user.id,
        status: 'pending',
      };

      await this.saveSession(session);
      await this.mailService.sendPasswordResetEmail(
        session.email,
        this.passwordResetLink(sessionId, code),
      );
    }

    return {
      sent: true as const,
      expiresIn: this.authSessionExpiresInSeconds,
    };
  }

  async resetPassword(input: {
    sessionId: string;
    code: string;
    password: string;
  }) {
    const session = await this.getSession(input.sessionId);
    if (session?.status !== 'pending' || session.mode !== 'password_reset') {
      return { error: 'not_found' as const };
    }

    if (session.codeHash !== this.codeHash(session.sessionId, input.code)) {
      return { error: 'invalid_code' as const };
    }

    if (!session.userId) {
      return { error: 'not_found' as const };
    }

    const passwordHash = await hash(input.password);
    const user = await this.prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash },
    });

    await this.redis.client.del(authSessionKey(session.sessionId));

    return {
      user: toUserJson(user),
      userId: user.id,
    };
  }

  async getSessionStatus(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { error: 'not_found' as const };
    }

    return {
      status: session.status,
      email: session.email,
      mode: session.mode,
      expiresIn: this.authSessionExpiresInSeconds,
    };
  }

  async createRefreshToken(userId: string) {
    const tokenId = randomUUID();
    await this.redis.client.setex(
      refreshTokenKey(tokenId),
      this.refreshExpiresInSeconds,
      userId,
    );
    return tokenId;
  }

  async revokeRefreshToken(tokenId: string) {
    await this.redis.client.del(refreshTokenKey(tokenId));
  }

  async rotateRefreshToken(tokenId: string) {
    const userId = await this.redis.client.get(refreshTokenKey(tokenId));
    if (!userId) {
      return null;
    }

    await this.revokeRefreshToken(tokenId);
    const newTokenId = await this.createRefreshToken(userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return null;
    }

    return { user: toUserJson(user), userId, refreshToken: newTokenId };
  }
}
