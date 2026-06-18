import { readEntityId } from '@/shared/api/dto';

import type { Follow, FollowRequest, RequestStatus, UserBlock } from '../model';

export type BackendFollowDto = {
  _id?: string;
  id?: string;
  followerId?: string;
  follower_id?: string;
  followingId?: string;
  following_id?: string;
  createdAt?: string;
  created_at?: string;
};

export type BackendFollowRequestDto = {
  _id?: string;
  id?: string;
  followerId?: string;
  follower_id?: string;
  followingId?: string;
  following_id?: string;
  status?: RequestStatus;
  createdAt?: string;
  created_at?: string;
};

export type BackendUserBlockDto = {
  _id?: string;
  id?: string;
  blockerId?: string;
  blocker_id?: string;
  blockedId?: string;
  blocked_id?: string;
  createdAt?: string;
  created_at?: string;
};

export function mapFollow(json: BackendFollowDto): Follow {
  return {
    id: readEntityId(json),
    followerId: json.followerId ?? json.follower_id ?? '',
    followingId: json.followingId ?? json.following_id ?? '',
    createdAt: json.createdAt ?? json.created_at ?? new Date().toISOString(),
  };
}

export function mapFollowRequest(json: BackendFollowRequestDto): FollowRequest {
  return {
    id: readEntityId(json),
    followerId: json.followerId ?? json.follower_id ?? '',
    followingId: json.followingId ?? json.following_id ?? '',
    status: json.status ?? 'pending',
    createdAt: json.createdAt ?? json.created_at ?? new Date().toISOString(),
  };
}

export function mapUserBlock(json: BackendUserBlockDto): UserBlock {
  return {
    id: readEntityId(json),
    blockerId: json.blockerId ?? json.blocker_id ?? '',
    blockedId: json.blockedId ?? json.blocked_id ?? '',
    createdAt: json.createdAt ?? json.created_at ?? new Date().toISOString(),
  };
}
