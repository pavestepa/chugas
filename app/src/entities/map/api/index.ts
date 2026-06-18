import { unwrapList } from '@/shared/api/dto';
import { apiRequest } from '@/shared/api';

import { mapPost, type BackendPostDto } from '@/entities/post/api/mappers';
import type { Post } from '@/entities/post';

import type { MapBounds, MapLocation, MapPoint, MapRadiusQuery, UserLocation } from '../model';
import {
  mapMapPoint,
  mapUserLocation,
  type BackendMapPointDto,
  type BackendUserLocationDto,
} from './mappers';

export async function getMapPoints(bounds?: MapBounds): Promise<MapPoint[]> {
  const data = await apiRequest<BackendMapPointDto[]>('/map/posts', {
    query: bounds
      ? {
          minLng: bounds.minLongitude,
          minLat: bounds.minLatitude,
          maxLng: bounds.maxLongitude,
          maxLat: bounds.maxLatitude,
          limit: bounds.limit ?? 100,
        }
      : undefined,
  });

  return unwrapList(data, ['points']).map(mapMapPoint);
}

export async function getMapPointsByRadius(query: MapRadiusQuery): Promise<MapPoint[]> {
  const data = await apiRequest<BackendMapPointDto[]>('/map/posts', {
    query: {
      lng: query.longitude,
      lat: query.latitude,
      radiusMeters: query.radiusMeters ?? 10_000,
      limit: query.limit ?? 100,
    },
  });

  return unwrapList(data, ['points']).map(mapMapPoint);
}

export async function getNearbyReadablePosts(location: MapLocation, limit = 50): Promise<Post[]> {
  const data = await apiRequest<BackendPostDto[]>('/map/posts/nearby', {
    query: {
      lng: location.longitude,
      lat: location.latitude,
      limit,
    },
  });

  return unwrapList(data, ['posts']).map(mapPost);
}

export async function getFollowingLocations(): Promise<UserLocation[]> {
  const data = await apiRequest<BackendUserLocationDto[]>('/location/following');
  return unwrapList(data).map(mapUserLocation);
}

export { syncUserLocationOnAuth, updateUserLocation } from './sync-user-location';
