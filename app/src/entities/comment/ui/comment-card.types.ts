import type { UserPreview } from '@/entities/user';

import type { Comment } from '../model';

export type CommentCardProps = {
  comment: Comment;
  author: UserPreview;
};
