import type { PostType, PostVisibility } from '@/entities/post';

export type MapLocation = {
  latitude: number;
  longitude: number;
};

export type MapPointId = string;

export type MapPoint = {
  id: MapPointId;
  postId: string;
  type: PostType;
  visibility: PostVisibility;
  authorId: string;
  communityId?: string;
  location?: MapLocation;
  expiresAt: string;
  secondsLeft: number;
};

export type UserLocation = {
  userId: string;
  location: MapLocation;
  updatedAt: number;
};

export type MapBounds = {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
  limit?: number;
};

export type MapRadiusQuery = {
  longitude: number;
  latitude: number;
  radiusMeters?: number;
  limit?: number;
};
