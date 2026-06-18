export default () => ({
  port: Number(process.env.PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://postgres:password@localhost:5432/chugas?schema=public',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshExpiresInSeconds: Number(process.env.REFRESH_EXPIRES_IN_SECONDS ?? 60 * 60 * 24 * 7),
  locationSyncDelayMs: Number(process.env.LOCATION_SYNC_DELAY_MS ?? 45_000),
  authSessionExpiresInSeconds: Number(process.env.AUTH_SESSION_EXPIRES_IN_SECONDS ?? 600),
  apiUrl: process.env.API_URL ?? 'http://localhost:3000',
  passwordResetUrl:
    process.env.PASSWORD_RESET_URL ??
    `${process.env.API_URL ?? 'http://localhost:3000'}/reset-password`,
  smtp: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'chugas <no-reply@chugas.local>',
  },
  seed: {
    email: process.env.SEED_USER_EMAIL ?? 'pavel@example.com',
    username: process.env.SEED_USER_USERNAME ?? 'pavel',
    password: process.env.SEED_USER_PASSWORD ?? 'password123',
    bio: process.env.SEED_USER_BIO ?? 'Default seeded user',
  },
});
