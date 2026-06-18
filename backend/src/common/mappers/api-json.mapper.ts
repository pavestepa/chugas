import type {
  Comment,
  Community,
  CommunityBan,
  CommunityMember,
  CommunityRequest,
  Conversation,
  Follow,
  FollowRequest,
  Message,
  Post,
  PostLike,
  User,
  UserBlock,
} from '@prisma/client';

type WithId = { id: string };

function baseEntity<T extends WithId>(entity: T): Omit<T, 'id'> & { _id: string } {
  const { id, ...rest } = entity;
  return { _id: id, ...rest } as Omit<T, 'id'> & { _id: string };
}

export function toUserJson(user: User) {
  const { passwordHash: _passwordHash, id, ...rest } = user;
  return { _id: id, ...rest };
}

export function toFollowJson(follow: Follow) {
  return baseEntity(follow);
}

export function toFollowRequestJson(request: FollowRequest) {
  return baseEntity(request);
}

export function toUserBlockJson(block: UserBlock) {
  return baseEntity(block);
}

export function toCommentJson(comment: Comment) {
  return baseEntity(comment);
}

export function toPostLikeJson(like: PostLike) {
  return baseEntity(like);
}

export function toCommunityMemberJson(member: CommunityMember) {
  return baseEntity(member);
}

export function toCommunityRequestJson(request: CommunityRequest) {
  return baseEntity(request);
}

export function toCommunityBanJson(ban: CommunityBan) {
  return baseEntity(ban);
}

export function toCommunityJson(community: Community, moderatorIds: string[]) {
  const { id, ...rest } = community;
  return { _id: id, ...rest, moderatorIds };
}

export function toPostJson(post: Post) {
  const { id, longitude, latitude, ...rest } = post;
  return {
    _id: id,
    ...rest,
    location: {
      type: 'Point' as const,
      coordinates: [longitude, latitude] as [number, number],
    },
  };
}

export function toConversationJson(
  conversation: Conversation,
  members: string[],
) {
  const { id, ...rest } = conversation;
  return { _id: id, ...rest, members };
}

export function toMessageJson(message: Message) {
  const { id, attachments, ...rest } = message;
  return {
    _id: id,
    ...rest,
    attachments: attachments as { type: string; url: string }[],
  };
}
