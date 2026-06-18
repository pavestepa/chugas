import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { WsHubService } from '../../common/services/ws-hub.service';
import { locationKey, RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FollowsService } from '../follows/follows.service';
import type { RedisLocation } from './dto/location.dto';

@Injectable()
export class LocationService {
  private readonly pendingSyncs = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly locationSyncDelayMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly followsService: FollowsService,
    private readonly wsHub: WsHubService,
    configService: ConfigService,
  ) {
    this.locationSyncDelayMs = configService.getOrThrow<number>('locationSyncDelayMs');
  }

  private async persistLocation(userId: string, lat: number, lng: number) {
    await this.prisma.location.upsert({
      where: { userId },
      create: { userId, latitude: lat, longitude: lng },
      update: { latitude: lat, longitude: lng },
    });
  }

  private scheduleMongoSync(userId: string, lat: number, lng: number) {
    const existing = this.pendingSyncs.get(userId);
    if (existing) {
      clearTimeout(existing);
    }

    this.pendingSyncs.set(
      userId,
      setTimeout(() => {
        this.pendingSyncs.delete(userId);
        void this.persistLocation(userId, lat, lng);
      }, this.locationSyncDelayMs),
    );
  }

  async update(userId: string, lat: number, lng: number): Promise<RedisLocation> {
    const payload: RedisLocation = {
      lat,
      lng,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    await this.redis.client.set(locationKey(userId), JSON.stringify(payload));
    this.scheduleMongoSync(userId, lat, lng);

    this.wsHub.emitToUser(userId, 'location:update', { userId, ...payload });

    const followerIds = await this.followsService.followerIds(userId);
    for (const followerId of followerIds) {
      this.wsHub.emitToUser(followerId, 'location:following_updated', {
        userId,
        ...payload,
      });
    }

    return payload;
  }

  async getFollowingLocations(userId: string) {
    const followingIds = await this.followsService.followingIds(userId);
    const locations = await Promise.all(
      followingIds.map(async (followingId) => {
        const cached = await this.redis.client.get(locationKey(followingId));
        if (cached) {
          return {
            userId: followingId,
            ...(JSON.parse(cached) as RedisLocation),
          };
        }

        const stored = await this.prisma.location.findUnique({
          where: { userId: followingId },
        });
        if (!stored) {
          return null;
        }

        return {
          userId: followingId,
          lat: stored.latitude,
          lng: stored.longitude,
          updatedAt: Math.floor(stored.updatedAt.getTime() / 1000),
        };
      }),
    );

    return locations.filter((item) => item !== null);
  }

  async flush(userId: string) {
    const cached = await this.redis.client.get(locationKey(userId));
    const pending = this.pendingSyncs.get(userId);
    if (pending) {
      clearTimeout(pending);
      this.pendingSyncs.delete(userId);
    }

    if (cached) {
      const { lat, lng } = JSON.parse(cached) as RedisLocation;
      await this.persistLocation(userId, lat, lng);
    }

    await this.redis.client.del(locationKey(userId));
  }
}
