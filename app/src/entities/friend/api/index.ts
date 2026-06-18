import { unwrapList } from '@/shared/api/dto';
import { apiRequest } from '@/shared/api';

import type { UserId } from '@/entities/user';

import type { Follow, FollowRequest, UserBlock } from '../model';
import {
  mapFollow,
  mapFollowRequest,
  mapUserBlock,
  type BackendFollowDto,
  type BackendFollowRequestDto,
  type BackendUserBlockDto,
} from './mappers';

export async function getFollowers(userId: UserId): Promise<Follow[]> {
  const data = await apiRequest<BackendFollowDto[]>(`/users/${userId}/followers`, { auth: false });
  return unwrapList(data).map(mapFollow);
}

export async function getFollowing(userId: UserId): Promise<Follow[]> {
  const data = await apiRequest<BackendFollowDto[]>(`/users/${userId}/following`, { auth: false });
  return unwrapList(data).map(mapFollow);
}

export async function followUser(targetUserId: UserId): Promise<Follow | FollowRequest> {
  const data = await apiRequest<BackendFollowDto | BackendFollowRequestDto>(
    `/users/${targetUserId}/follow`,
    { method: 'POST' },
  );

  if ('status' in data && data.status) {
    return mapFollowRequest(data);
  }

  return mapFollow(data);
}

export async function unfollowUser(targetUserId: UserId): Promise<void> {
  await apiRequest(`/users/${targetUserId}/follow`, { method: 'DELETE' });
}

export async function getIncomingFollowRequests(): Promise<FollowRequest[]> {
  const data = await apiRequest<BackendFollowRequestDto[]>('/follow-requests');
  return unwrapList(data, ['requests']).map(mapFollowRequest);
}

export async function getOutgoingFollowRequests(): Promise<FollowRequest[]> {
  const data = await apiRequest<BackendFollowRequestDto[]>('/follow-requests/sent');
  return unwrapList(data, ['requests']).map(mapFollowRequest);
}

export async function acceptFollowRequest(followRequestId: string): Promise<FollowRequest> {
  const data = await apiRequest<{ request: BackendFollowRequestDto }>(
    `/follow-requests/${followRequestId}/accept`,
    { method: 'POST' },
  );

  return mapFollowRequest(data.request);
}

export async function rejectFollowRequest(followRequestId: string): Promise<FollowRequest> {
  const data = await apiRequest<BackendFollowRequestDto>(
    `/follow-requests/${followRequestId}/reject`,
    { method: 'POST' },
  );

  return mapFollowRequest(data);
}

export async function blockUser(targetUserId: UserId): Promise<UserBlock> {
  const data = await apiRequest<BackendUserBlockDto>(`/users/${targetUserId}/block`, { method: 'POST' });
  return mapUserBlock(data);
}

export async function unblockUser(targetUserId: UserId): Promise<void> {
  await apiRequest(`/users/${targetUserId}/block`, { method: 'DELETE' });
}

export async function getBlocks(): Promise<UserBlock[]> {
  const data = await apiRequest<BackendUserBlockDto[]>('/blocks');
  return unwrapList(data).map(mapUserBlock);
}
