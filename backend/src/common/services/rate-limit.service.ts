import { Injectable } from '@nestjs/common';

import { rateLimitKey, RedisService } from '../../redis/redis.service';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async rateLimit({
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
    const count = await this.redis.client.incr(key);

    if (count === 1) {
      await this.redis.client.expire(key, windowSeconds);
    }

    const ttl = await this.redis.client.ttl(key);

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetInSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  }

  rateLimitedResponse(resetInSeconds: number) {
    return {
      error: 'Rate limit exceeded',
      resetInSeconds,
    } as const;
  }
}
