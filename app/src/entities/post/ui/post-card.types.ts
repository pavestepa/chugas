import type { UserPreview } from '@/entities/user';

import type { Post } from '../model';

export type PostAuthor = UserPreview;

export type PostCardProps = {
  post: Post;
  author: PostAuthor;
  onCommentsPress?: () => void;
};
