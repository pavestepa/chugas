import { t } from "elysia";

export const idParams = t.Object({ id: t.String() });

export const usernameBody = t.String({
  minLength: 3,
  maxLength: 32,
  pattern: "^[a-zA-Z0-9_]+$",
});

export const codeBody = t.String({
  pattern: "^\\d{6}$",
  description: "6-digit verification code",
});

export const mediaBody = t.String();

export const locationBody = t.Object({
  lng: t.Number({ minimum: -180, maximum: 180 }),
  lat: t.Number({ minimum: -90, maximum: 90 }),
});

export const locationQuery = t.Object({
  lng: t.Number({ minimum: -180, maximum: 180 }),
  lat: t.Number({ minimum: -90, maximum: 90 }),
});

export const objectIdBody = t.String();

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
