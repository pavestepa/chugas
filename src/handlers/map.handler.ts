import { getUserId } from "@/lib/auth";
import { Elysia, t } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { PostsService } from "@/services/posts.service";

const mapFilters = t.Object({
  type: t.Optional(
    t.Union([
      t.Literal("public"),
      t.Literal("followers"),
      t.Literal("community"),
    ])
  ),
  communityId: t.Optional(t.String()),
  followingId: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 500 })),
  minLng: t.Optional(t.Number({ minimum: -180, maximum: 180 })),
  minLat: t.Optional(t.Number({ minimum: -90, maximum: 90 })),
  maxLng: t.Optional(t.Number({ minimum: -180, maximum: 180 })),
  maxLat: t.Optional(t.Number({ minimum: -90, maximum: 90 })),
  lng: t.Optional(t.Number({ minimum: -180, maximum: 180 })),
  lat: t.Optional(t.Number({ minimum: -90, maximum: 90 })),
  radiusMeters: t.Optional(t.Number({ minimum: 1, maximum: 100_000 })),
});

function viewportFromQuery(query: {
  minLng?: number;
  minLat?: number;
  maxLng?: number;
  maxLat?: number;
  lng?: number;
  lat?: number;
  radiusMeters?: number;
}) {
  if (
    query.minLng !== undefined &&
    query.minLat !== undefined &&
    query.maxLng !== undefined &&
    query.maxLat !== undefined
  ) {
    return {
      bbox: {
        minLng: query.minLng,
        minLat: query.minLat,
        maxLng: query.maxLng,
        maxLat: query.maxLat,
      },
    };
  }

  if (query.lng !== undefined && query.lat !== undefined) {
    return {
      center: { lng: query.lng, lat: query.lat },
      ...(query.radiusMeters !== undefined
        ? { radiusMeters: query.radiusMeters }
        : {}),
    };
  }

  return null;
}

export const mapHandler = new Elysia({ prefix: "/map", tags: ["Map"] })
  .use(authPlugin)
  .get(
    "/posts",
    async ({ query, userId, set }) => {
      const viewport = viewportFromQuery(query);
      if (!viewport) {
        set.status = 400;
        return { error: "bbox or center+radius is required" };
      }

      const result = await PostsService.mapPoints({
        userId: getUserId(userId),
        ...viewport,
        ...(query.type !== undefined ? { type: query.type } : {}),
        ...(query.communityId !== undefined
          ? { communityId: query.communityId }
          : {}),
        ...(query.followingId !== undefined
          ? { followingId: query.followingId }
          : {}),
        ...(query.limit !== undefined ? { limit: query.limit } : {}),
      });
      if ("error" in result) {
        set.status = 400;
        return { error: "bbox or center+radius is required" };
      }
      return result.points;
    },
    {
      auth: true,
      query: mapFilters,
      detail: { summary: "Get visible map post points" },
    }
  )
  .get(
    "/posts/nearby",
    async ({ query, userId }) => {
      const result = await PostsService.nearbyReadable({
        userId: getUserId(userId),
        location: { lng: query.lng, lat: query.lat },
        ...(query.type !== undefined ? { type: query.type } : {}),
        ...(query.communityId !== undefined
          ? { communityId: query.communityId }
          : {}),
        ...(query.followingId !== undefined
          ? { followingId: query.followingId }
          : {}),
        ...(query.limit !== undefined ? { limit: query.limit } : {}),
      });
      return result.posts;
    },
    {
      auth: true,
      query: t.Object({
        lng: t.Number({ minimum: -180, maximum: 180 }),
        lat: t.Number({ minimum: -90, maximum: 90 }),
        type: t.Optional(
          t.Union([
            t.Literal("public"),
            t.Literal("followers"),
            t.Literal("community"),
          ])
        ),
        communityId: t.Optional(t.String()),
        followingId: t.Optional(t.String()),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 200 })),
      }),
      detail: { summary: "Get readable nearby posts within 500m" },
    }
  );
