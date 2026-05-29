import { rateLimitKey, redis } from "@/db/redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export async function rateLimit({
  scope,
  identity,
  limit,
  windowSeconds,
}: {
  scope: string;
  identity: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const key = rateLimitKey(scope, identity);
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetInSeconds: ttl > 0 ? ttl : windowSeconds,
  };
}

export function rateLimitedResponse(resetInSeconds: number) {
  return {
    error: "Rate limit exceeded",
    resetInSeconds,
  } as const;
}
