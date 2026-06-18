import { create } from 'zustand';

import { getCurrentUser, getUser } from '@/entities/user/api';
import type { UserPreview } from '@/entities/user';
import { toUserPreview } from '@/entities/user/model/user-label';

import { getPosts } from '../api';
import type { Post } from '../model';
import type { PostAuthor } from '../ui/post-card.types';

type PostsStoreState = {
  posts: Post[];
  authors: Record<string, PostAuthor>;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isInitialized: boolean;
  loadPosts: () => Promise<void>;
  refresh: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
  reset: () => void;
};

const initialState = {
  posts: [] as Post[],
  authors: {} as Record<string, PostAuthor>,
  isLoading: true,
  isRefreshing: false,
  error: null as string | null,
  isInitialized: false,
};

async function loadAuthors(postsList: Post[]) {
  const embeddedAuthors = postsList
    .map((post) => post.author)
    .filter((author): author is NonNullable<Post['author']> => Boolean(author));
  const authorIds = [
    ...new Set(postsList.map((post) => post.authorId).filter((authorId) => authorId.trim())),
  ].filter((authorId) => !embeddedAuthors.some((author) => author.id === authorId));
  const users = await Promise.all(authorIds.map((id) => getUser(id)));

  return [...embeddedAuthors, ...users].reduce<Record<string, PostAuthor>>((acc, user) => {
    acc[user.id] = toUserPreview(user);
    return acc;
  }, {});
}

export const usePostsStore = create<PostsStoreState>((set, get) => ({
  ...initialState,

  loadPosts: async () => {
    try {
      set({ error: null });
      const postsList = await getPosts();
      const authorsMap = await loadAuthors(postsList);
      set({ posts: postsList, authors: authorsMap });
    } catch {
      set({ error: 'Не удалось загрузить посты' });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true });
    await get().loadPosts();
    set({ isRefreshing: false });
  },

  ensureLoaded: async () => {
    if (get().isInitialized) {
      return;
    }

    await get().loadPosts();
    set({ isLoading: false, isInitialized: true });
  },

  reset: () => {
    set({ ...initialState, isLoading: false, isInitialized: false });
  },
}));
