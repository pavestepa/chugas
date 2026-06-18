import { apiRequest } from '@/shared/api';

import type { AuthSession } from '../model';
import { mapAuthSession, type AuthTokensResponseDto } from './mappers';
import { saveStoredSession } from './session-storage';

async function requestSessionRefresh(refreshToken: string): Promise<AuthSession> {
  const data = await apiRequest<AuthTokensResponseDto>('/auth/refresh', {
    method: 'POST',
    auth: false,
    body: { refreshToken },
  });

  return mapAuthSession(data);
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const session = await requestSessionRefresh(refreshToken);
  await saveStoredSession(session);
  return session;
}
