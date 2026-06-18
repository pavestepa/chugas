import { apiRequest } from '@/shared/api';

import { loadStoredSession } from '@/entities/signin/api/session-storage';

import { refreshSession } from '@/entities/signin/api/refresh-session';
import { syncStoredSessionUser } from './session-user';

import type { UpdateUserPayload, User, UserId } from '../model';
import { mapUpdateUserPayload, mapUser, type BackendUserDto } from './mappers';

export async function getUser(id: UserId): Promise<User> {
  const data = await apiRequest<BackendUserDto>(`/users/${id}`, { auth: false });
  return mapUser(data);
}

export async function getCurrentUser(): Promise<User> {
  const stored = await loadStoredSession();

  if (stored?.user) {
    return stored.user;
  }

  if (!stored?.refreshToken) {
    throw new Error('User is not authenticated');
  }

  const session = await refreshSession(stored.refreshToken);

  if (!session.user) {
    throw new Error('User profile is unavailable');
  }

  return session.user;
}

export async function updateCurrentUser(payload: UpdateUserPayload): Promise<User> {
  const data = await apiRequest<BackendUserDto>('/users/me', {
    method: 'PATCH',
    body: mapUpdateUserPayload(payload),
  });

  const user = mapUser(data);
  await syncStoredSessionUser(user);
  return user;
}

export async function searchUsers(query: string): Promise<User[]> {
  const data = await apiRequest<BackendUserDto[]>('/users/search', {
    auth: false,
    query: { q: query },
  });

  return data.map(mapUser);
}
