export const POST_READ_RADIUS_METERS = 500;
export const POST_TTL_HOURS = 5;
export const MESSAGE_TTL_HOURS = 5;

const EARTH_RADIUS_METERS = 6_371_000;

export interface Coordinates {
  lng: number;
  lat: number;
}

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export function normalizeCoordinates(input: Coordinates): Coordinates {
  if (input.lng < -180 || input.lng > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }

  if (input.lat < -90 || input.lat > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }

  return input;
}

export function normalizeBBox(input: BBox): BBox {
  normalizeCoordinates({ lng: input.minLng, lat: input.minLat });
  normalizeCoordinates({ lng: input.maxLng, lat: input.maxLat });

  if (input.minLng >= input.maxLng) {
    throw new Error('minLng must be less than maxLng');
  }

  if (input.minLat >= input.maxLat) {
    throw new Error('minLat must be less than maxLat');
  }

  return input;
}

export function postExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + POST_TTL_HOURS * 60 * 60 * 1000);
}

export function messageExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + MESSAGE_TTL_HOURS * 60 * 60 * 1000);
}

export function secondsUntil(date: Date, now = new Date()): number {
  return Math.max(0, Math.floor((date.getTime() - now.getTime()) / 1000));
}

export function distanceMeters(from: Coordinates, to: Coordinates): number {
  const fromLat = (from.lat * Math.PI) / 180;
  const toLat = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

  return (
    2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function toGeoPoint(longitude: number, latitude: number) {
  return {
    type: 'Point' as const,
    coordinates: [longitude, latitude] as [number, number],
  };
}
