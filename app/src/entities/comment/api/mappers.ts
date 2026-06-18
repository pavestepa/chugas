import { mapUser, type BackendUserDto } from '@/entities/user/api/mappers';

import type { Comment } from '../model';

export type BackendCommentDto = {
  _id?: string;
  id?: string;
  postId?: string;
  post_id?: string;
  authorId?: string;
  author_id?: string;
  author?: string | BackendUserDto;
  text?: string;
  createdAt?: string;
  created_at?: string;
};

function getAuthorId(json: BackendCommentDto) {
  if (typeof json.author === 'string') {
    return json.author;
  }

  return json.authorId ?? json.author_id ?? json.author?._id ?? json.author?.id ?? '';
}

export function mapComment(json: BackendCommentDto): Comment {
  return {
    id: json._id ?? json.id ?? '',
    postId: json.postId ?? json.post_id ?? '',
    authorId: getAuthorId(json),
    author: typeof json.author === 'object' ? mapUser(json.author) : undefined,
    text: json.text ?? '',
    createdAt: json.createdAt ?? json.created_at ?? new Date().toISOString(),
  };
}
