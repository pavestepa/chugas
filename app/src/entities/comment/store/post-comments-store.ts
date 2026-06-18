import { create } from 'zustand';

import { getUser } from '@/entities/user/api';
import type { User, UserPreview } from '@/entities/user';
import { toUserPreview } from '@/entities/user/model/user-label';
import type { PostId } from '@/entities/post';

import { createComment as createCommentRequest, getCommentsByPostId } from '../api';
import type { Comment } from '../model';

type PostCommentsSlice = {
  comments: Comment[];
  authors: Record<string, UserPreview>;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  isInitialized: boolean;
};

type PostCommentsStoreState = {
  byPostId: Record<string, PostCommentsSlice>;
  getSlice: (postId: PostId) => PostCommentsSlice;
  setSlice: (postId: PostId, patch: Partial<PostCommentsSlice>) => void;
  loadComments: (postId: PostId) => Promise<void>;
  ensureLoaded: (postId: PostId) => Promise<void>;
  submitComment: (postId: PostId, text: string) => Promise<void>;
  resetPost: (postId: PostId) => void;
  reset: () => void;
};

const emptySlice = (): PostCommentsSlice => ({
  comments: [],
  authors: {},
  isLoading: true,
  isSubmitting: false,
  error: null,
  isInitialized: false,
});

export const usePostCommentsStore = create<PostCommentsStoreState>((set, get) => ({
  byPostId: {},

  getSlice: (postId) => {
    return get().byPostId[postId] ?? emptySlice();
  },

  setSlice: (postId, patch) => {
    set((state) => ({
      byPostId: {
        ...state.byPostId,
        [postId]: {
          ...(state.byPostId[postId] ?? emptySlice()),
          ...patch,
        },
      },
    }));
  },

  loadComments: async (postId) => {
    try {
      get().setSlice(postId, { error: null });
      const comments = await getCommentsByPostId(postId);
      const embeddedAuthors = comments
        .map((comment) => comment.author)
        .filter((user): user is User => Boolean(user));
      const authorIds = [
        ...new Set(comments.map((comment) => comment.authorId).filter((authorId) => authorId.trim())),
      ].filter((authorId) => !embeddedAuthors.some((author) => author.id === authorId));
      const loadedAuthors = await Promise.all(authorIds.map((authorId) => getUser(authorId)));

      get().setSlice(postId, {
        authors: Object.fromEntries(
          [...embeddedAuthors, ...loadedAuthors].map((author) => [author.id, toUserPreview(author)]),
        ),
        comments,
      });
    } catch {
      get().setSlice(postId, { error: 'Не удалось загрузить комментарии' });
    }
  },

  ensureLoaded: async (postId) => {
    const slice = get().getSlice(postId);

    if (slice.isInitialized) {
      return;
    }

    await get().loadComments(postId);
    get().setSlice(postId, { isLoading: false, isInitialized: true });
  },

  submitComment: async (postId, text) => {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    get().setSlice(postId, { isSubmitting: true });

    try {
      await createCommentRequest(postId, trimmed);
      await get().loadComments(postId);
      get().setSlice(postId, { error: null });
    } catch {
      get().setSlice(postId, { error: 'Не удалось отправить комментарий' });
    } finally {
      get().setSlice(postId, { isSubmitting: false });
    }
  },

  resetPost: (postId) => {
    set((state) => {
      const { [postId]: _slice, ...byPostId } = state.byPostId;
      return { byPostId };
    });
  },

  reset: () => {
    set({ byPostId: {} });
  },
}));

export type CommentAuthor = UserPreview;
