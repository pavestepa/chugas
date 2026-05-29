export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "mongodb://root:password@localhost:27017/irlgram?authSource=admin",
  mongoDbName: process.env.MONGO_DB_NAME ?? "irlgram",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  refreshExpiresInSeconds: Number(
    process.env.REFRESH_EXPIRES_IN_SECONDS ?? 60 * 60 * 24 * 7
  ),
  locationSyncDelayMs: Number(process.env.LOCATION_SYNC_DELAY_MS ?? 45_000),
  authSessionExpiresInSeconds: Number(
    process.env.AUTH_SESSION_EXPIRES_IN_SECONDS ?? 600
  ),
  authBotSecret: process.env.AUTH_BOT_SECRET ?? "change-me-bot-secret",
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME ?? "irlgram_auth_bot",
  apiUrl: process.env.API_URL ?? "http://localhost:3000",
} as const;
