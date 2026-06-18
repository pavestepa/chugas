import { create } from 'zustand';

import { loadStoredSession } from '@/entities/signin/api/session-storage';

import { getCurrentUser, updateCurrentUser } from '../api';
import type { UpdateUserPayload, User } from '../model';

type CurrentUserStoreState = {
  user: User | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isInitialized: boolean;
  loadUser: () => Promise<void>;
  refresh: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
  updateUser: (payload: UpdateUserPayload) => Promise<User>;
  setUser: (user: User) => void;
  reset: () => void;
};

const initialState = {
  user: null as User | null,
  isLoading: true,
  isRefreshing: false,
  error: null as string | null,
  isInitialized: false,
};

export const useCurrentUserStore = create<CurrentUserStoreState>((set, get) => ({
  ...initialState,

  loadUser: async () => {
    try {
      set({ error: null });
      const stored = await loadStoredSession();

      if (stored?.user) {
        set({ user: stored.user });
        return;
      }

      const data = await getCurrentUser();
      set({ user: data });
    } catch {
      set({ error: 'Не удалось загрузить профиль' });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true });
    await get().loadUser();
    set({ isRefreshing: false });
  },

  ensureLoaded: async () => {
    if (get().isInitialized) {
      return;
    }

    await get().loadUser();
    set({ isLoading: false, isInitialized: true });
  },

  updateUser: async (payload) => {
    const updatedUser = await updateCurrentUser(payload);
    set({ user: updatedUser });
    return updatedUser;
  },

  setUser: (user) => {
    set({ user });
  },

  reset: () => {
    set({ ...initialState, isLoading: false, isInitialized: false });
  },
}));
