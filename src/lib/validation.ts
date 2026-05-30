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

export const resetCodeBody = t.String({
  minLength: 32,
  maxLength: 128,
  description: "Password reset code from email link",
});

export const emailBody = t.String({
  format: "email",
  maxLength: 254,
});

export const authIdentifierBody = t.String({
  minLength: 3,
  maxLength: 254,
});

export const passwordBody = t.String({
  minLength: 8,
  maxLength: 128,
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

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
