import { apiRequest } from '@/shared/api';

import type { AuthSession, SignInCredentials } from '../model';
import { mapAuthSession, type AuthTokensResponseDto } from './mappers';
import { clearStoredSession, loadStoredSession, saveStoredSession } from './session-storage';

async function requestSignIn(credentials: SignInCredentials): Promise<AuthSession> {
  const data = await apiRequest<AuthTokensResponseDto>('/auth/login', {
    method: 'POST',
    auth: false,
    body: credentials,
  });

  return mapAuthSession(data);
}

export async function signIn(credentials: SignInCredentials): Promise<AuthSession> {
  const session = await requestSignIn(credentials);
  await saveStoredSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  const storedSession = await loadStoredSession();

  if (storedSession?.refreshToken) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: { refreshToken: storedSession.refreshToken },
      });
    } catch {
      // Local session cleanup should not depend on network availability.
    }
  }

  await clearStoredSession();
}

export { refreshSession } from './refresh-session';
