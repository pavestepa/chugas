export type UserId = string;
export type AccountType = 'open' | 'closed';

export type User = {
  id: UserId;
  username: string;
  email: string;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  accountType: AccountType;
  createdAt: string;
  updatedAt: string;
};

export type UpdateUserPayload = {
  username?: string;
  avatarUrl?: string;
  bio?: string;
  accountType?: AccountType;
};

export type UserPreview = Pick<User, 'id' | 'username' | 'avatarUrl'>;
