import type { User, UserId } from '@/entities/user';

export type PostId = string;
export type PostType = 'public' | 'followers' | 'community';
export type PostVisibility = 'public' | 'followers' | 'community';

export type PostLocation = {
  latitude: number;
  longitude: number;
};

export type Post = {
  id: PostId;
  authorId: UserId;
  author?: User;
  type: PostType;
  visibility: PostVisibility;
  communityId?: string;
  text: string;
  media: string[];
  location: PostLocation;
  createdAt: string;
  expiresAt: string;
};

export type CreatePostPayload = {
  type: PostType;
  text: string;
  media?: string[];
  location: PostLocation;
  communityId?: string;
};

export function getPrimaryMediaUrl(post: Pick<Post, 'media'>) {
  return post.media[0];
}

export function formatPostTypeLabel(type: PostType) {
  switch (type) {
    case 'public':
      return 'Публичный';
    case 'followers':
      return 'Подписчики';
    case 'community':
      return 'Сообщество';
  }
}
