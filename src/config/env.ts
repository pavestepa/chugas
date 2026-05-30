export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "mongodb://root:password@localhost:27017/chugas?authSource=admin",
  mongoDbName: process.env.MONGO_DB_NAME ?? "chugas",
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
  apiUrl: process.env.API_URL ?? "http://localhost:3000",
  passwordResetUrl:
    process.env.PASSWORD_RESET_URL ??
    `${process.env.API_URL ?? "http://localhost:3000"}/reset-password`,
  smtpHost: process.env.SMTP_HOST ?? "localhost",
  smtpPort: Number(process.env.SMTP_PORT ?? 1025),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "chugas <no-reply@chugas.local>",
} as const;
