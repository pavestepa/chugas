import { unwrapList } from '@/shared/api/dto';
import { apiRequest } from '@/shared/api';

import type { PostId } from '@/entities/post';

import type { Comment, CommentId } from '../model';
import { mapComment, type BackendCommentDto } from './mappers';

export async function getCommentsByPostId(postId: PostId): Promise<Comment[]> {
  const data = await apiRequest<BackendCommentDto[] | { comments?: BackendCommentDto[] }>(
    `/posts/${postId}/comments`,
    { auth: false },
  );

  return unwrapList(data, ['comments']).map(mapComment);
}

export async function createComment(postId: PostId, text: string): Promise<Comment> {
  const data = await apiRequest<BackendCommentDto>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: { text },
  });

  return mapComment(data);
}

export async function deleteComment(commentId: CommentId): Promise<void> {
  await apiRequest(`/comments/${commentId}`, {
    method: 'DELETE',
  });
}
