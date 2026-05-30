import Redis from "ioredis";
import { env } from "@/config/env";

export const redis = new Redis(env.redisUrl);

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}

export function locationKey(userId: string): string {
  return `user:location:${userId}`;
}

export function refreshTokenKey(tokenId: string): string {
  return `refresh:${tokenId}`;
}

export function authSessionKey(sessionId: string): string {
  return `auth:session:${sessionId}`;
}

export function wsUserKey(userId: string): string {
  return `ws:user:${userId}`;
}

export function rateLimitKey(scope: string, identity: string): string {
  return `rate:${scope}:${identity}`;
}
