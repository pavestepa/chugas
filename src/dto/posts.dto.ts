export type PostType = "public" | "friend" | "community";
export type PostVisibility = "public" | "friends" | "community";

export interface GeoPointDto {
  type: "Point";
  coordinates: number[];
}

export interface MapPoint {
  postId: string;
  type: PostType;
  visibility: PostVisibility;
  communityId?: string;
  authorId: string;
  location?: GeoPointDto | null;
  expiresAt: Date;
  secondsLeft: number;
}

export interface ReadablePost {
  _id: string;
  authorId: string;
  type: PostType;
  visibility: PostVisibility;
  communityId?: string;
  text: string;
  media: string[];
  location?: GeoPointDto | null;
  createdAt: Date;
  expiresAt: Date;
}
