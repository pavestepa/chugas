import { unwrapList } from '@/shared/api/dto';
import { apiRequest } from '@/shared/api';

import { useLocationStore } from '@/entities/map/store/location-store';

import type { CreatePostPayload, Post, PostId } from '../model';
import { mapCreatePostPayload, mapPost, type BackendPostDto } from './mappers';

function readerLocationQuery() {
  const location = useLocationStore.getState().location;

  if (!location) {
    return undefined;
  }

  return {
    lng: location.longitude,
    lat: location.latitude,
  };
}

export async function getPost(id: PostId): Promise<Post> {
  const data = await apiRequest<BackendPostDto>(`/posts/${id}`, {
    query: readerLocationQuery(),
  });
  return mapPost(data);
}

export async function getPosts(): Promise<Post[]> {
  const data = await apiRequest<BackendPostDto[]>('/feed');
  return unwrapList(data, ['posts']).map(mapPost);
}

export async function createPost(payload: CreatePostPayload): Promise<Post> {
  const data = await apiRequest<BackendPostDto>('/posts/', {
    method: 'POST',
    body: mapCreatePostPayload(payload),
  });
  return mapPost(data);
}

export async function deletePost(id: PostId): Promise<void> {
  await apiRequest(`/posts/${id}`, { method: 'DELETE' });
}

export async function likePost(id: PostId): Promise<void> {
  await apiRequest(`/posts/${id}/like`, { method: 'POST' });
}

export async function unlikePost(id: PostId): Promise<void> {
  await apiRequest(`/posts/${id}/like`, { method: 'DELETE' });
}
