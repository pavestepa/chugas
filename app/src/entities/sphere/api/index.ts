import { apiRequest } from '@/shared/api';

import type { CreateCommunityPayload, Sphere, SphereId, UpdateCommunityPayload } from '../model';
import { mapSphere, type BackendCommunityDto } from './mappers';

function unwrapCommunities(
  data: BackendCommunityDto[] | { communities?: BackendCommunityDto[]; items?: BackendCommunityDto[] },
) {
  return Array.isArray(data) ? data : data.communities ?? data.items ?? [];
}

export async function getSphere(id: SphereId): Promise<Sphere> {
  const data = await apiRequest<BackendCommunityDto>(`/communities/${id}`, { auth: false });
  return mapSphere(data);
}

export async function getSpheres(): Promise<Sphere[]> {
  const data = await apiRequest<
    BackendCommunityDto[] | { communities?: BackendCommunityDto[]; items?: BackendCommunityDto[] }
  >('/communities', { auth: false });
  return unwrapCommunities(data).map(mapSphere);
}

export async function createSphere(payload: CreateCommunityPayload): Promise<Sphere> {
  const data = await apiRequest<BackendCommunityDto>('/communities/', {
    method: 'POST',
    body: payload,
  });
  return mapSphere(data);
}

export async function updateSphere(id: SphereId, payload: UpdateCommunityPayload): Promise<Sphere> {
  const data = await apiRequest<BackendCommunityDto>(`/communities/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return mapSphere(data);
}

export async function joinSphere(id: SphereId): Promise<void> {
  await apiRequest(`/communities/${id}/join`, { method: 'POST' });
}

export async function leaveSphere(id: SphereId): Promise<void> {
  await apiRequest(`/communities/${id}/leave`, { method: 'POST' });
}

export async function deleteSphere(id: SphereId): Promise<void> {
  await apiRequest(`/communities/${id}`, { method: 'DELETE' });
}
