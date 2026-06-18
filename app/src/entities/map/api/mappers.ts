import { mapGeoPointToLocation, readEntityId } from '@/shared/api/dto';

import type { PostType, PostVisibility } from '@/entities/post';

import type { MapLocation, MapPoint } from '../model';

export type BackendLocationDto = {
  type?: 'Point';
  coordinates?: [number, number];
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
};

export type BackendMapPointDto = {
  _id?: string;
  id?: string;
  postId?: string;
  type?: PostType;
  visibility?: PostVisibility;
  authorId?: string;
  communityId?: string;
  location?: BackendLocationDto | null;
  expiresAt?: string;
  expires_at?: string;
  secondsLeft?: number;
  seconds_left?: number;
};

export function mapMapLocationToJson(location: MapLocation) {
  return {
    lat: location.latitude,
    lng: location.longitude,
  };
}

export function mapMapPoint(json: BackendMapPointDto): MapPoint {
  return {
    id: readEntityId(json) || json.postId || '',
    postId: json.postId ?? readEntityId(json),
    type: json.type ?? 'public',
    visibility: json.visibility ?? json.type ?? 'public',
    authorId: json.authorId ?? '',
    communityId: json.communityId,
    location: mapGeoPointToLocation(json.location ?? undefined),
    expiresAt: json.expiresAt ?? json.expires_at ?? new Date().toISOString(),
    secondsLeft: json.secondsLeft ?? json.seconds_left ?? 0,
  };
}

export type BackendUserLocationDto = {
  userId?: string;
  user_id?: string;
  lat?: number;
  lng?: number;
  updatedAt?: number;
  updated_at?: number;
};

export function mapUserLocation(json: BackendUserLocationDto) {
  return {
    userId: json.userId ?? json.user_id ?? '',
    location: {
      latitude: json.lat ?? 0,
      longitude: json.lng ?? 0,
    },
    updatedAt: json.updatedAt ?? json.updated_at ?? 0,
  };
}
