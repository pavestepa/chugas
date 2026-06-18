import type { PostId } from '@/entities/post';
import type { User, UserId } from '@/entities/user';

export type CommentId = string;

export type Comment = {
  id: CommentId;
  postId: PostId;
  authorId: UserId;
  author?: User;
  text: string;
  createdAt: string;
};
