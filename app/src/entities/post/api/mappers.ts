import { mapGeoPointToLocation, mapLocationToCoordinates } from '@/shared/api/dto';

import { mapUser, type BackendUserDto } from '@/entities/user/api/mappers';

import type { CreatePostPayload, Post, PostType, PostVisibility } from '../model';

export type BackendPostDto = {
  _id?: string;
  id?: string;
  authorId?: string;
  author_id?: string;
  author?: string | BackendUserDto;
  type?: PostType;
  visibility?: PostVisibility;
  communityId?: string;
  text?: string;
  media?: string[] | { url?: string }[];
  location?: {
    type?: 'Point';
    coordinates?: [number, number];
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  };
  createdAt?: string;
  created_at?: string;
  expiresAt?: string;
  expires_at?: string;
};

function getAuthorId(json: BackendPostDto) {
  if (typeof json.author === 'string') {
    return json.author;
  }

  return json.authorId ?? json.author_id ?? json.author?._id ?? json.author?.id ?? '';
}

function mapMedia(media: BackendPostDto['media']) {
  if (!media) {
    return [];
  }

  return media.map((item) => (typeof item === 'string' ? item : item.url ?? '')).filter(Boolean);
}

export function mapPost(json: BackendPostDto): Post {
  const text = json.text ?? '';
  const type = json.type ?? 'public';
  const location = mapGeoPointToLocation(json.location) ?? { latitude: 0, longitude: 0 };

  return {
    id: json._id ?? json.id ?? '',
    authorId: getAuthorId(json),
    author: typeof json.author === 'object' ? mapUser(json.author) : undefined,
    type,
    visibility: json.visibility ?? type,
    communityId: json.communityId,
    text,
    media: mapMedia(json.media),
    location,
    createdAt: json.createdAt ?? json.created_at ?? new Date().toISOString(),
    expiresAt: json.expiresAt ?? json.expires_at ?? new Date().toISOString(),
  };
}

export function mapCreatePostPayload(payload: CreatePostPayload) {
  return {
    type: payload.type,
    communityId: payload.communityId,
    text: payload.text,
    media: payload.media ?? [],
    location: mapLocationToCoordinates(payload.location),
  };
}
