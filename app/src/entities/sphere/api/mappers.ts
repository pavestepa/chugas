import { readEntityId } from '@/shared/api/dto';

import type { Sphere } from '../model';

export type BackendCommunityDto = {
  _id?: string;
  id?: string;
  nickname?: string;
  title?: string;
  description?: string;
  bio?: string;
  avatarUrl?: string;
  avatar_url?: string;
  ownerId?: string;
  owner_id?: string;
  access?: Sphere['access'];
  moderatorIds?: string[];
  moderator_ids?: string[];
  membersCount?: number;
  members_count?: number;
  createdAt?: string;
  created_at?: string;
};

export function mapSphere(json: BackendCommunityDto): Sphere {
  return {
    id: readEntityId(json),
    nickname: json.nickname ?? '',
    title: json.title ?? json.nickname ?? '',
    description: json.description ?? '',
    bio: json.bio ?? '',
    avatarUrl: json.avatarUrl ?? json.avatar_url ?? '',
    ownerId: json.ownerId ?? json.owner_id ?? '',
    access: json.access ?? 'open',
    moderatorIds: json.moderatorIds ?? json.moderator_ids ?? [],
    membersCount: json.membersCount ?? json.members_count ?? 0,
    createdAt: json.createdAt ?? json.created_at ?? new Date().toISOString(),
  };
}
