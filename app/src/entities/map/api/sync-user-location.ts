import { apiRequest } from '@/shared/api';

import type { MapLocation } from '../model';
import { mapMapLocationToJson } from './mappers';
import { requestCurrentLocation } from './location-access';

export async function updateUserLocation(location: MapLocation) {
  await apiRequest('/location/update', {
    method: 'POST',
    body: mapMapLocationToJson(location),
  });
}

export async function syncUserLocationOnAuth(): Promise<MapLocation | null> {
  const location = await requestCurrentLocation();

  if (!location) {
    return null;
  }

  await updateUserLocation(location);
  return location;
}
