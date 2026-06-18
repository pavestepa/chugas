import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export function authSessionKey(sessionId: string) {
  return `auth:session:${sessionId}`;
}

export function refreshTokenKey(tokenId: string) {
  return `refresh:${tokenId}`;
}

export function locationKey(userId: string) {
  return `user:location:${userId}`;
}

export function rateLimitKey(scope: string, identity: string) {
  return `rate:${scope}:${identity}`;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(configService: ConfigService) {
    this.client = new Redis(configService.getOrThrow<string>('redisUrl'));
  }

  onModuleDestroy() {
    void this.client.quit();
  }
}
