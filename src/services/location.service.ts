import { env } from "@/config/env";
import { locationKey, redis } from "@/db/redis";
import { FriendsService } from "@/services/friends.service";
import { LocationModel } from "@/schemas/location.schema";
import { wsHub } from "@/lib/ws-hub";

export interface RedisLocation {
  lat: number;
  lng: number;
  updatedAt: number;
}

const pendingSyncs = new Map<string, ReturnType<typeof setTimeout>>();

async function persistLocation(userId: string, lat: number, lng: number) {
  await LocationModel.findOneAndUpdate(
    { userId },
    {
      userId,
      location: { type: "Point", coordinates: [lng, lat] },
    },
    { upsert: true, new: true, runValidators: true }
  );
}

function scheduleMongoSync(userId: string, lat: number, lng: number) {
  const existing = pendingSyncs.get(userId);
  if (existing) {
    clearTimeout(existing);
  }

  pendingSyncs.set(
    userId,
    setTimeout(() => {
      pendingSyncs.delete(userId);
      void persistLocation(userId, lat, lng);
    }, env.locationSyncDelayMs)
  );
}

export const LocationService = {
  update: async (userId: string, lat: number, lng: number) => {
    const payload: RedisLocation = {
      lat,
      lng,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    await redis.set(locationKey(userId), JSON.stringify(payload));
    scheduleMongoSync(userId, lat, lng);

    wsHub.emitToUser(userId, "location:update", { userId, ...payload });

    const friendIds = await FriendsService.friendIds(userId);
    for (const friendId of friendIds) {
      wsHub.emitToUser(friendId, "location:friend_updated", {
        userId,
        ...payload,
      });
    }

    return payload;
  },

  getFriendsLocations: async (userId: string) => {
    const friendIds = await FriendsService.friendIds(userId);
    const locations = await Promise.all(
      friendIds.map(async (friendId) => {
        const cached = await redis.get(locationKey(friendId));
        if (cached) {
          return {
            userId: friendId,
            ...(JSON.parse(cached) as RedisLocation),
          };
        }

        const stored = await LocationModel.findOne({ userId: friendId });
        if (!stored?.location?.coordinates) {
          return null;
        }

        const [lng, lat] = stored.location.coordinates;
        return {
          userId: friendId,
          lat,
          lng,
          updatedAt: Math.floor(stored.updatedAt.getTime() / 1000),
        };
      })
    );

    return locations.filter((item) => item !== null);
  },

  flush: async (userId: string) => {
    const cached = await redis.get(locationKey(userId));
    const pending = pendingSyncs.get(userId);
    if (pending) {
      clearTimeout(pending);
      pendingSyncs.delete(userId);
    }

    if (cached) {
      const { lat, lng } = JSON.parse(cached) as RedisLocation;
      await persistLocation(userId, lat, lng);
    }

    await redis.del(locationKey(userId));
  },
};
