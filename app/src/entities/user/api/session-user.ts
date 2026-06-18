import { loadStoredSession, saveStoredSession } from '@/entities/signin/api/session-storage';
import type { User } from '@/entities/user';

export async function syncStoredSessionUser(user: User) {
  const stored = await loadStoredSession();

  if (!stored) {
    return;
  }

  await saveStoredSession({
    ...stored,
    user,
  });
}
