#!/usr/bin/env python3
"""Enrich Postman collection with TypeScript model/type documentation."""

import json
from pathlib import Path

COLLECTION_PATH = (
    Path(__file__).resolve().parents[2] / "docs/postman/chugas.postman_collection.json"
)

COLLECTION_DESCRIPTION = """# chugas API

Postman collection for the chugas Elysia API. Import together with `chugas Local` environment.

This document is the source of truth for **request/response shapes** when building mobile frontend entities and models.

## Conventions

- `_id`, `authorId`, `userId`, etc. are MongoDB ObjectIds serialized as **strings**
- `createdAt`, `expiresAt`, `updatedAt` are **ISO 8601 date strings** in JSON
- `GeoPoint.coordinates` is `[lng, lat]` — index 0 = longitude, index 1 = latitude
- Authenticated requests use header `Authorization: Bearer {{accessToken}}`
- Empty success bodies use HTTP **204** with no JSON body
- Errors usually return `{ error: string }` plus optional fields

## Primitive & shared types

```typescript
type ObjectIdString = string;
type ISODateString = string;

type AccountType = "open" | "closed";
type PostType = "public" | "followers" | "community";
type PostVisibility = "public" | "followers" | "community";
type CommunityAccess = "open" | "closed";
type RequestStatus = "pending" | "accepted" | "rejected";
type ConversationType = "private" | "group";
type CommunityRole = "member" | "moderator" | "owner";
type AuthSessionStatus = "pending" | "email_verified" | "completed";
type AuthSessionMode = "register" | "password_setup" | "password_reset";

interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

interface CoordinatesInput {
  lng: number; // -180..180
  lat: number; // -90..90
}

interface ErrorResponse {
  error: string;
  resetInSeconds?: number; // 429 rate limit
  point?: MapPoint; // 403 when post is too far
  request?: FollowRequest; // 409 duplicate follow request
}

interface RateLimitError {
  error: "Rate limit exceeded";
  resetInSeconds: number;
}
```

## Core entities

```typescript
interface User {
  _id: ObjectIdString;
  username: string;
  email: string;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  accountType: AccountType;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

interface Post {
  _id: ObjectIdString;
  authorId: ObjectIdString;
  type: PostType;
  visibility: PostVisibility;
  communityId?: ObjectIdString;
  text: string;
  media: string[];
  location: GeoPoint;
  createdAt: ISODateString;
  expiresAt: ISODateString;
}

interface MapPoint {
  postId: ObjectIdString;
  type: PostType;
  visibility: PostVisibility;
  authorId: ObjectIdString;
  communityId?: ObjectIdString;
  location?: GeoPoint | null;
  expiresAt: ISODateString;
  secondsLeft: number;
}

interface Follow {
  _id: ObjectIdString;
  followerId: ObjectIdString;
  followingId: ObjectIdString;
  createdAt: ISODateString;
}

interface FollowRequest {
  _id: ObjectIdString;
  followerId: ObjectIdString;
  followingId: ObjectIdString;
  status: RequestStatus;
  createdAt: ISODateString;
}

interface UserBlock {
  _id: ObjectIdString;
  blockerId: ObjectIdString;
  blockedId: ObjectIdString;
  createdAt: ISODateString;
}

interface Comment {
  _id: ObjectIdString;
  postId: ObjectIdString;
  authorId: ObjectIdString;
  text: string;
  createdAt: ISODateString;
}

interface PostLike {
  _id: ObjectIdString;
  postId: ObjectIdString;
  userId: ObjectIdString;
  createdAt: ISODateString;
}

interface Community {
  _id: ObjectIdString;
  nickname: string;
  title: string;
  description: string;
  bio: string;
  avatarUrl: string;
  ownerId: ObjectIdString;
  access: CommunityAccess;
  moderatorIds: ObjectIdString[];
  membersCount: number;
  createdAt: ISODateString;
}

interface CommunityMember {
  _id: ObjectIdString;
  communityId: ObjectIdString;
  userId: ObjectIdString;
  role: CommunityRole;
  createdAt: ISODateString;
}

interface CommunityRequest {
  _id: ObjectIdString;
  communityId: ObjectIdString;
  fromUserId: ObjectIdString;
  status: RequestStatus;
  createdAt: ISODateString;
}

interface CommunityBan {
  _id: ObjectIdString;
  communityId: ObjectIdString;
  userId: ObjectIdString;
  bannedById: ObjectIdString;
  reason: string;
  createdAt: ISODateString;
}

interface Conversation {
  _id: ObjectIdString;
  type: ConversationType;
  members: ObjectIdString[];
  lastMessageAt: ISODateString;
  createdAt: ISODateString;
}

interface MessageAttachment {
  type: string;
  url: string;
}

interface Message {
  _id: ObjectIdString;
  conversationId: ObjectIdString;
  senderId: ObjectIdString;
  text: string;
  attachments: MessageAttachment[];
  createdAt: ISODateString;
  expiresAt: ISODateString;
}

interface UserLocation {
  userId: ObjectIdString;
  lat: number;
  lng: number;
  updatedAt: number; // unix seconds
}
```

## Auth payloads

```typescript
interface AuthTokensResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface EmailSessionStartResponse {
  sessionId: string;
  expiresIn: number;
  email: string;
  status: AuthSessionStatus;
}

interface EmailVerifyResponse {
  sessionId: string;
  email: string;
  mode: AuthSessionMode;
  status: AuthSessionStatus;
}

interface AuthSessionStatusResponse {
  status: AuthSessionStatus;
  email: string;
  mode: AuthSessionMode;
  expiresIn: number;
}

interface PasswordResetRequestResponse {
  sent: true;
  expiresIn: number;
}
```

## Request bodies

```typescript
interface CreatePostBody {
  type: PostType;
  text: string;
  media?: string[];
  communityId?: ObjectIdString; // required when type = "community"
  location: CoordinatesInput;
}

interface CreateCommentBody {
  text: string; // 1..2000
}

interface CreateCommunityBody {
  nickname: string; // 3..32, [a-zA-Z0-9_]
  title: string;
  access: CommunityAccess;
  description?: string;
  bio?: string;
  avatarUrl?: string;
}

interface UpdateCommunityBody {
  nickname?: string;
  title?: string;
  description?: string;
  bio?: string;
  avatarUrl?: string;
  access?: CommunityAccess;
}

interface UpdateUserBody {
  username?: string;
  avatarUrl?: string;
  bio?: string;
  accountType?: AccountType;
}

interface CreateConversationBody {
  type: ConversationType;
  members: ObjectIdString[];
}

interface SendMessageBody {
  text: string;
  attachments?: MessageAttachment[];
}

interface LocationUpdateBody {
  lat: number;
  lng: number;
}
```

## WebSocket

Connect: `ws://host/ws?token={{accessToken}}`

```typescript
type WsEvent =
  | "location:update"
  | "location:following_updated"
  | "message:new"
  | "typing:start"
  | "typing:stop"
  | "notification:new";

interface WsEnvelope<T = unknown> {
  event: WsEvent;
  data: T;
}

// Client → server (typing only)
interface WsTypingPayload {
  conversationId: ObjectIdString;
}

// Server → client examples
interface WsLocationPayload extends UserLocation {}
interface WsMessagePayload extends Message {}
interface WsTypingServerPayload {
  conversationId: ObjectIdString;
  userId: ObjectIdString;
}
```

See folder **Models & Types** and per-request `## Types` sections for endpoint-specific shapes.
"""

FOLDER_DESCRIPTIONS = {
    "Models & Types": "Reference-only TypeScript definitions for frontend/mobile entity modeling. Not API calls.",
    "Core Entities": "Persistent domain objects returned by REST endpoints.",
    "Auth Types": "Authentication session and token payloads.",
    "Realtime Types": "WebSocket event envelopes.",
    "Health": "Service health. Response types listed per request.",
    "Auth": "Registration, login, password reset. Uses Auth* types from collection description.",
    "Users": "User profile CRUD and search. Entity: `User`.",
    "Posts": "Geo-tagged ephemeral posts. Entities: `Post`, `CreatePostBody`.",
    "Map": "Map markers and nearby readable posts. Entities: `MapPoint`, `Post`.",
    "Comments & Likes": "Post engagement. Entities: `Comment`, `PostLike`.",
    "Follows & Blocks": "Instagram-style follows with open/closed accounts. Entities: `Follow`, `FollowRequest`, `UserBlock`.",
    "Communities": "Groups with open/closed join. Entities: `Community`, `CommunityMember`, `CommunityRequest`, `CommunityBan`.",
    "Messages": "Private/group chat. Entities: `Conversation`, `Message`.",
    "Location": "Live geolocation. Entity: `UserLocation`.",
    "WebSocket": "Realtime events. See `WsEnvelope` in collection description.",
}

REFERENCE_MODELS = [
    (
        "User",
        """Reference model — `User`

```typescript
interface User {
  _id: ObjectIdString;
  username: string;
  email: string;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  accountType: AccountType;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

Used in: auth responses, `/users/*`, search results.""",
    ),
    (
        "Post",
        """Reference model — `Post`

```typescript
interface Post {
  _id: ObjectIdString;
  authorId: ObjectIdString;
  type: PostType;
  visibility: PostVisibility;
  communityId?: ObjectIdString;
  text: string;
  media: string[];
  location: GeoPoint;
  createdAt: ISODateString;
  expiresAt: ISODateString;
}
```

`type` and `visibility` are usually aligned. Posts auto-expire via `expiresAt`.""",
    ),
    (
        "MapPoint",
        """Reference model — `MapPoint`

```typescript
interface MapPoint {
  postId: ObjectIdString;
  type: PostType;
  visibility: PostVisibility;
  authorId: ObjectIdString;
  communityId?: ObjectIdString;
  location?: GeoPoint | null;
  expiresAt: ISODateString;
  secondsLeft: number;
}
```

Lightweight map marker; use `GET /posts/:id` for full post body.""",
    ),
    (
        "Follow & FollowRequest",
        """Reference models — social graph

```typescript
interface Follow {
  _id: ObjectIdString;
  followerId: ObjectIdString;
  followingId: ObjectIdString;
  createdAt: ISODateString;
}

interface FollowRequest {
  _id: ObjectIdString;
  followerId: ObjectIdString;
  followingId: ObjectIdString;
  status: RequestStatus;
  createdAt: ISODateString;
}
```

`accountType: "closed"` requires `FollowRequest` approval before a `Follow` exists.""",
    ),
    (
        "Community",
        """Reference models — communities

```typescript
interface Community {
  _id: ObjectIdString;
  nickname: string;
  title: string;
  description: string;
  bio: string;
  avatarUrl: string;
  ownerId: ObjectIdString;
  access: CommunityAccess;
  moderatorIds: ObjectIdString[];
  membersCount: number;
  createdAt: ISODateString;
}

interface CommunityMember {
  _id: ObjectIdString;
  communityId: ObjectIdString;
  userId: ObjectIdString;
  role: CommunityRole;
  createdAt: ISODateString;
}

interface CommunityRequest {
  _id: ObjectIdString;
  communityId: ObjectIdString;
  fromUserId: ObjectIdString;
  status: RequestStatus;
  createdAt: ISODateString;
}

interface CommunityBan {
  _id: ObjectIdString;
  communityId: ObjectIdString;
  userId: ObjectIdString;
  bannedById: ObjectIdString;
  reason: string;
  createdAt: ISODateString;
}
```""",
    ),
    (
        "Conversation & Message",
        """Reference models — messaging

```typescript
interface Conversation {
  _id: ObjectIdString;
  type: ConversationType;
  members: ObjectIdString[];
  lastMessageAt: ISODateString;
  createdAt: ISODateString;
}

interface Message {
  _id: ObjectIdString;
  conversationId: ObjectIdString;
  senderId: ObjectIdString;
  text: string;
  attachments: MessageAttachment[];
  createdAt: ISODateString;
  expiresAt: ISODateString;
}
```

Blocked users cannot create conversations or send messages.""",
    ),
]

AUTH_TYPES = [
    (
        "AuthTokensResponse",
        """```typescript
interface AuthTokensResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
```""",
    ),
    (
        "EmailSessionStartResponse",
        """```typescript
interface EmailSessionStartResponse {
  sessionId: string;
  expiresIn: number;
  email: string;
  status: AuthSessionStatus;
}
```""",
    ),
    (
        "EmailVerifyResponse",
        """```typescript
interface EmailVerifyResponse {
  sessionId: string;
  email: string;
  mode: AuthSessionMode;
  status: AuthSessionStatus;
}
```""",
    ),
]

REALTIME_TYPES = [
    (
        "WsEnvelope",
        """```typescript
interface WsEnvelope<T = unknown> {
  event: WsEvent;
  data: T;
}
```""",
    ),
    (
        "WsLocationPayload",
        """```typescript
interface WsLocationPayload {
  userId: ObjectIdString;
  lat: number;
  lng: number;
  updatedAt: number;
}
```""",
    ),
    (
        "WsTypingPayload",
        """Client sends:
```typescript
{ event: "typing:start" | "typing:stop", data: { conversationId: ObjectIdString } }
```

Server broadcasts to other members:
```typescript
{ event: "typing:start" | "typing:stop", data: { conversationId: ObjectIdString, userId: ObjectIdString } }
```""",
    ),
]

REQUEST_TYPES = {
    "Root": {
        "response": '{ name: string; status: string; docs: string }',
        "errors": "None",
    },
    "Swagger UI": {
        "response": "HTML page (OpenAPI/Swagger UI)",
        "errors": "None",
    },
    "Start Email Session": {
        "request": '{ identifier: string } // email or username, 3..254 chars',
        "response": "EmailSessionStartResponse",
        "errors": "404 `{ error: string }` | 429 RateLimitError",
    },
    "Verify Email Code": {
        "request": '{ sessionId: string; code: string } // code: 6 digits',
        "response": "EmailVerifyResponse",
        "errors": "401 invalid code | 404 session | 429",
    },
    "Setup Password": {
        "request": '{ sessionId: string; username: string; password: string }',
        "response": "AuthTokensResponse",
        "errors": "404 session | 409 username taken | 429",
    },
    "Login With Password": {
        "request": '{ identifier: string; password: string }',
        "response": "AuthTokensResponse",
        "errors": "401 invalid credentials | 429",
    },
    "Get Auth Session Status": {
        "response": "AuthSessionStatusResponse",
        "errors": "404 session",
    },
    "Request Password Reset Link": {
        "request": '{ identifier: string }',
        "response": "PasswordResetRequestResponse",
        "errors": "429",
    },
    "Confirm Password Reset": {
        "request": '{ sessionId: string; code: string; password: string }',
        "response": "AuthTokensResponse",
        "errors": "401 invalid code | 404 session | 429",
    },
    "Refresh Token": {
        "request": '{ refreshToken: string }',
        "response": "AuthTokensResponse",
        "errors": "401 invalid refresh token",
    },
    "Logout": {
        "request": '{ refreshToken: string }',
        "response": '{ success: true }',
        "errors": "None",
    },
    "Search Users": {
        "query": "q: string (min 1 char)",
        "response": "User[]",
        "errors": "Validation error if q missing",
    },
    "Get User By Id": {
        "response": "User",
        "errors": "404 `{ error: string }`",
    },
    "Update Me": {
        "request": "UpdateUserBody (all fields optional)",
        "response": "User",
        "errors": "404",
    },
    "Set Closed Account": {
        "request": '{ accountType: "closed" }',
        "response": "User",
        "errors": "404",
    },
    "Set Open Account": {
        "request": '{ accountType: "open" }',
        "response": "User",
        "errors": "404",
    },
    "Create Public Post": {
        "request": 'CreatePostBody with type: "public"',
        "response": "Post",
        "errors": "403 forbidden | 429",
    },
    "Create Followers Post": {
        "request": 'CreatePostBody with type: "followers"',
        "response": "Post",
        "errors": "403 | 429",
    },
    "Create Community Post": {
        "request": 'CreatePostBody with type: "community" and communityId',
        "response": "Post",
        "errors": "400 communityId required | 403 not a member | 429",
    },
    "Get Feed": {
        "response": "Post[]",
        "errors": "401",
    },
    "Get Readable Post": {
        "query": "lng: number, lat: number",
        "response": "Post",
        "errors": '404 not found | 403 `{ error: "Post is outside readable radius", point: MapPoint }`',
    },
    "Delete Post": {
        "response": "204 empty",
        "errors": "404",
    },
    "Map Points By BBox": {
        "query": "minLng, minLat, maxLng, maxLat, limit?, type?, communityId?, followingId?",
        "response": "MapPoint[]",
        "errors": "400 viewport required | 401",
    },
    "Map Points By Center Radius": {
        "query": "lng, lat, radiusMeters?, limit?, type?, communityId?, followingId?",
        "response": "MapPoint[]",
        "errors": "400 | 401",
    },
    "Nearby Readable Posts": {
        "query": "lng, lat, limit?, type?, communityId?, followingId?",
        "response": "Post[]",
        "errors": "401",
    },
    "Create Comment": {
        "request": "CreateCommentBody",
        "response": "Comment",
        "errors": "401",
    },
    "List Comments": {
        "response": "Comment[]",
        "errors": "None",
    },
    "Delete Comment": {
        "response": "204 empty",
        "errors": "404",
    },
    "Like Post": {
        "response": "PostLike",
        "errors": "409 already liked | 401",
    },
    "Unlike Post": {
        "response": "204 empty",
        "errors": "404 like not found | 401",
    },
    "Follow User": {
        "response": 'Follow (open account) | FollowRequest with HTTP 201 (closed account)',
        "errors": "400 self follow | 403 blocked | 404 user | 409 already following or request exists `{ error, request? }` | 429",
    },
    "Unfollow User": {
        "response": "204 empty (unfollow or cancel pending request)",
        "errors": "404 | 401",
    },
    "Incoming Follow Requests": {
        "response": "FollowRequest[]",
        "errors": "401",
    },
    "Outgoing Follow Requests": {
        "response": "FollowRequest[]",
        "errors": "401",
    },
    "Accept Follow Request": {
        "response": '{ request: FollowRequest; follow: Follow }',
        "errors": "403 blocked | 404 | 401",
    },
    "Reject Follow Request": {
        "response": "FollowRequest",
        "errors": "404 | 401",
    },
    "Get User Followers": {
        "response": "Follow[]",
        "errors": "None",
    },
    "Get User Following": {
        "response": "Follow[]",
        "errors": "None",
    },
    "Block User": {
        "response": "UserBlock",
        "errors": "400 self block | 401",
    },
    "Unblock User": {
        "response": "204 empty",
        "errors": "404 | 401",
    },
    "List Blocks": {
        "response": "UserBlock[]",
        "errors": "401",
    },
    "Create Community": {
        "request": "CreateCommunityBody",
        "response": "Community",
        "errors": "401 validation",
    },
    "Get Community": {
        "response": "Community",
        "errors": "404",
    },
    "Update Community": {
        "request": "UpdateCommunityBody",
        "response": "Community",
        "errors": "403 forbidden or owner required | 404",
    },
    "Join Community": {
        "response": '{ member: CommunityMember } for open | { request: CommunityRequest } for closed',
        "errors": "404 | 409 already member | 429",
    },
    "Leave Community": {
        "response": '{ success: true }',
        "errors": "400 owner cannot leave | 404",
    },
    "Community Readable Posts": {
        "query": "lng, lat",
        "response": "Post[]",
        "errors": "401",
    },
    "Community Map Points": {
        "response": "MapPoint[]",
        "errors": "401",
    },
    "Delete Community Post": {
        "response": "204 empty",
        "errors": "403 | 404",
    },
    "List Community Requests": {
        "response": "CommunityRequest[]",
        "errors": "403 | 401",
    },
    "Accept Community Request": {
        "response": '{ request: CommunityRequest; member: CommunityMember }',
        "errors": "403 | 404",
    },
    "Reject Community Request": {
        "response": "CommunityRequest",
        "errors": "403 | 404",
    },
    "Add Moderator": {
        "response": "CommunityMember",
        "errors": "403 | 404",
    },
    "Remove Moderator": {
        "response": "CommunityMember",
        "errors": "403 | 404",
    },
    "Ban User": {
        "request": '{ reason?: string }',
        "response": "CommunityBan",
        "errors": "400 cannot ban owner/moderator | 403",
    },
    "Unban User": {
        "response": '{ success: true }',
        "errors": "403 | 404",
    },
    "List Bans": {
        "response": "CommunityBan[]",
        "errors": "403",
    },
    "Delete Community": {
        "response": "204 empty",
        "errors": "403 owner only | 404",
    },
    "Create Conversation": {
        "request": "CreateConversationBody",
        "response": "Conversation",
        "errors": "403 blocked users | 401",
    },
    "List Conversations": {
        "response": "Conversation[]",
        "errors": "401",
    },
    "List Messages": {
        "response": "Message[]",
        "errors": "403 blocked | 404 | 401",
    },
    "Send Message": {
        "request": "SendMessageBody",
        "response": "Message",
        "errors": "403 forbidden or blocked | 404 | 401",
    },
    "Update Location": {
        "request": "LocationUpdateBody",
        "response": "UserLocation",
        "errors": "429 | 401",
    },
    "Following Locations": {
        "response": "UserLocation[]",
        "errors": "401",
    },
    "Connection URL": {
        "response": "WebSocket — see Realtime Types folder and collection description",
        "errors": "4401 unauthorized on bad token",
    },
}


def make_reference_item(name: str, description: str):
    return {
        "name": name,
        "request": {
            "auth": {"type": "noauth"},
            "method": "GET",
            "header": [],
            "url": "{{baseUrl}}/",
            "description": description,
        },
    }


def build_models_folder():
    return {
        "name": "Models & Types",
        "description": FOLDER_DESCRIPTIONS["Models & Types"],
        "item": [
            {
                "name": "Core Entities",
                "description": FOLDER_DESCRIPTIONS["Core Entities"],
                "item": [make_reference_item(n, d) for n, d in REFERENCE_MODELS],
            },
            {
                "name": "Auth Types",
                "description": FOLDER_DESCRIPTIONS["Auth Types"],
                "item": [make_reference_item(n, d) for n, d in AUTH_TYPES],
            },
            {
                "name": "Realtime Types",
                "description": FOLDER_DESCRIPTIONS["Realtime Types"],
                "item": [make_reference_item(n, d) for n, d in REALTIME_TYPES],
            },
        ],
    }


def format_types_block(name: str, types: dict) -> str:
    lines = ["\n\n---\n\n## Types\n"]
    if types.get("request"):
        lines.append(f"### Request body\n```typescript\n{types['request']}\n```\n")
    if types.get("query"):
        lines.append(f"### Query params\n```typescript\n{types['query']}\n```\n")
    if types.get("response"):
        lines.append(f"### Response\n```typescript\n{types['response']}\n```\n")
    if types.get("errors"):
        lines.append(f"### Errors\n{types['errors']}\n")
    return "".join(lines)


def enrich_items(items):
    for item in items:
        if "item" in item:
            folder_name = item.get("name", "")
            if folder_name in FOLDER_DESCRIPTIONS and not item.get("description"):
                item["description"] = FOLDER_DESCRIPTIONS[folder_name]
            enrich_items(item["item"])
            continue

        name = item.get("name", "")
        request = item.get("request")
        if not request:
            continue

        types = REQUEST_TYPES.get(name)
        if not types:
            continue

        base = request.get("description", "").rstrip()
        if "## Types" in base:
            base = base.split("---\n\n## Types")[0].rstrip()

        request["description"] = base + format_types_block(name, types)


def main():
    collection = json.loads(COLLECTION_PATH.read_text())
    collection["info"]["description"] = COLLECTION_DESCRIPTION

    items = collection.get("item", [])
    if not items or items[0].get("name") != "Models & Types":
        items.insert(0, build_models_folder())
    else:
        items[0] = build_models_folder()

    enrich_items(items)
    collection["item"] = items

    COLLECTION_PATH.write_text(json.dumps(collection, indent=2, ensure_ascii=False) + "\n")
    print(f"Updated {COLLECTION_PATH}")


if __name__ == "__main__":
    main()
