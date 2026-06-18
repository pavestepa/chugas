import type { AccountType, UpdateUserPayload, User } from '../model';

export type BackendUserDto = {
  _id?: string;
  id?: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
  avatar_url?: string;
  bio?: string;
  followersCount?: number;
  followers_count?: number;
  followingCount?: number;
  following_count?: number;
  accountType?: AccountType;
  account_type?: AccountType;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

export function mapUser(json: BackendUserDto): User {
  const id = json._id ?? json.id ?? '';
  const username = json.username ?? json.email?.split('@')[0] ?? id;

  return {
    id,
    username,
    email: json.email ?? '',
    avatarUrl: json.avatarUrl ?? json.avatar_url ?? '',
    bio: json.bio ?? '',
    followersCount: json.followersCount ?? json.followers_count ?? 0,
    followingCount: json.followingCount ?? json.following_count ?? 0,
    accountType: json.accountType ?? json.account_type ?? 'open',
    createdAt: json.createdAt ?? json.created_at ?? new Date().toISOString(),
    updatedAt: json.updatedAt ?? json.updated_at ?? new Date().toISOString(),
  };
}

export function mapUpdateUserPayload(payload: UpdateUserPayload) {
  return {
    username: payload.username,
    avatarUrl: payload.avatarUrl,
    bio: payload.bio,
    accountType: payload.accountType,
  };
}
