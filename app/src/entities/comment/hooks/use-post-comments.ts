import { useEffect } from 'react';

import type { PostId } from '@/entities/post';

import { usePostCommentsStore } from '../store/post-comments-store';

const emptySlice = {
  comments: [],
  authors: {},
  isLoading: true,
  isSubmitting: false,
  error: null,
} as const;

export function usePostComments(postId: PostId) {
  const slice = usePostCommentsStore((state) => state.byPostId[postId] ?? emptySlice);
  const ensureLoaded = usePostCommentsStore((state) => state.ensureLoaded);
  const submitComment = usePostCommentsStore((state) => state.submitComment);

  useEffect(() => {
    void ensureLoaded(postId);
  }, [ensureLoaded, postId]);

  return {
    comments: slice.comments,
    authors: slice.authors,
    isLoading: slice.isLoading,
    isSubmitting: slice.isSubmitting,
    error: slice.error,
    submitComment: (text: string) => submitComment(postId, text),
  };
}

export type { CommentAuthor } from '../store/post-comments-store';
