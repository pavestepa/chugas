import type { UserId } from '@/entities/user';

export type FollowId = string;
export type RequestStatus = 'pending' | 'accepted' | 'rejected';

export type Follow = {
  id: FollowId;
  followerId: UserId;
  followingId: UserId;
  createdAt: string;
};

export type FollowRequest = {
  id: string;
  followerId: UserId;
  followingId: UserId;
  status: RequestStatus;
  createdAt: string;
};

export type UserBlock = {
  id: string;
  blockerId: UserId;
  blockedId: UserId;
  createdAt: string;
};
