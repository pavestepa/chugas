export type SphereId = string;
export type CommunityAccess = 'open' | 'closed';
export type CommunityRole = 'member' | 'moderator' | 'owner';

export type Sphere = {
  id: SphereId;
  nickname: string;
  title: string;
  description: string;
  bio: string;
  avatarUrl: string;
  ownerId: string;
  access: CommunityAccess;
  moderatorIds: string[];
  membersCount: number;
  createdAt: string;
};

export type CreateCommunityPayload = {
  nickname: string;
  title: string;
  access: CommunityAccess;
  description?: string;
  bio?: string;
  avatarUrl?: string;
};

export type UpdateCommunityPayload = {
  nickname?: string;
  title?: string;
  description?: string;
  bio?: string;
  avatarUrl?: string;
  access?: CommunityAccess;
};
