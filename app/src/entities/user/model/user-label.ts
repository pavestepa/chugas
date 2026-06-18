import type { User, UserPreview } from './types';

export function getUserLabel(user: Pick<User, 'username'>) {
  return user.username;
}

export function getUserInitials(user: Pick<User, 'username'>) {
  return user.username.slice(0, 2).toUpperCase();
}

export function toUserPreview(user: User | UserPreview): UserPreview {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}
