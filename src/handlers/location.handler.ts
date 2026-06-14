import { getUserId } from "@/lib/auth";
import { Elysia, t } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin";
import { LocationService } from "@/services/location.service";
import { rateLimit, rateLimitedResponse } from "@/lib/rate-limit";

export const locationHandler = new Elysia({
  prefix: "/location",
  tags: ["Geolocation"],
})
  .use(authPlugin)
  .post(
    "/update",
    async ({ userId, body, set }) => {
      const currentUserId = getUserId(userId);
      const limit = await rateLimit({
        scope: "location-update",
        identity: currentUserId,
        limit: 60,
        windowSeconds: 60,
      });
      if (!limit.allowed) {
        set.status = 429;
        return rateLimitedResponse(limit.resetInSeconds);
      }

      return LocationService.update(currentUserId, body.lat, body.lng);
    },
    {
      auth: true,
      body: t.Object({
        lat: t.Number({ minimum: -90, maximum: 90 }),
        lng: t.Number({ minimum: -180, maximum: 180 }),
      }),
      detail: { summary: "Update location (Redis + debounced Mongo sync)" },
    }
  )
  .get(
    "/following",
    ({ userId }) => LocationService.getFollowingLocations(getUserId(userId)),
    {
      auth: true,
      detail: { summary: "Get followed users locations" },
    }
  );
