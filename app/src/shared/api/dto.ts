export type ObjectIdString = string;
export type ISODateString = string;

export type GeoPoint = {
  type: 'Point';
  coordinates: [number, number];
};

export type CoordinatesInput = {
  lng: number;
  lat: number;
};

export function readEntityId(value: { _id?: string; id?: string } | string | undefined | null) {
  if (typeof value === 'string') {
    return value;
  }

  return value?._id ?? value?.id ?? '';
}

export function unwrapList<T>(
  data: T[] | { items?: T[] } | Record<string, T[] | undefined> | null | undefined,
  keys: string[] = ['items'],
): T[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  for (const key of keys) {
    const value = (data as Record<string, T[] | undefined>)[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

export function mapGeoPointToLocation(
  point?: GeoPoint | CoordinatesInput | { lat?: number; lng?: number; latitude?: number; longitude?: number; coordinates?: [number, number] } | null,
) {
  if (!point) {
    return undefined;
  }

  if ('coordinates' in point && point.coordinates) {
    const [longitude, latitude] = point.coordinates;

    return { latitude, longitude };
  }

  const latitude =
    'lat' in point && point.lat !== undefined
      ? point.lat
      : 'latitude' in point
        ? point.latitude
        : undefined;
  const longitude =
    'lng' in point && point.lng !== undefined
      ? point.lng
      : 'longitude' in point
        ? point.longitude
        : undefined;

  if (latitude === undefined || longitude === undefined) {
    return undefined;
  }

  return { latitude, longitude };
}

export function mapLocationToCoordinates(location: { latitude: number; longitude: number }): CoordinatesInput {
  return {
    lat: location.latitude,
    lng: location.longitude,
  };
}
