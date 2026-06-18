import * as SecureStore from 'expo-secure-store';

export const AUTH_SESSION_STORAGE_KEY = 'auth_session';

type StoredAuthSession = {
  accessToken?: string;
};

export async function getStoredAccessToken() {
  const raw = await SecureStore.getItemAsync(AUTH_SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as StoredAuthSession;
    return session.accessToken ?? null;
  } catch {
    return null;
  }
}
