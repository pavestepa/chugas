import {
  FriendRequestModel,
  toFriendRequestJson,
} from "@/schemas/friend-request.schema";
import { FriendshipModel, toFriendshipJson } from "@/schemas/friendship.schema";
import { BlocksService } from "@/services/blocks.service";

function friendshipPair(userId: string, friendId: string) {
  return userId < friendId
    ? { userA: userId, userB: friendId }
    : { userA: friendId, userB: userId };
}

async function friendshipExists(userId: string, friendId: string) {
  return Boolean(
    await FriendshipModel.exists(friendshipPair(userId, friendId))
  );
}

export const FriendsService = {
  sendRequest: async (fromUserId: string, toUserId: string) => {
    if (fromUserId === toUserId) {
      return { error: "self_request" as const };
    }

    if (await friendshipExists(fromUserId, toUserId)) {
      return { error: "already_friends" as const };
    }

    if (await BlocksService.isBlockedBetween(fromUserId, toUserId)) {
      return { error: "blocked" as const };
    }

    const existingPendingRequest = await FriendRequestModel.findOne({
      status: "pending",
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    });

    if (existingPendingRequest) {
      return {
        error: "request_exists" as const,
        request: toFriendRequestJson(existingPendingRequest),
      };
    }

    const request = await FriendRequestModel.create({
      fromUserId,
      toUserId,
      status: "pending",
    });

    return { request: toFriendRequestJson(request) };
  },

  incomingRequests: async (userId: string) => {
    const requests = await FriendRequestModel.find({
      toUserId: userId,
      status: "pending",
    }).sort({ createdAt: -1 });

    return requests.map(toFriendRequestJson);
  },

  outgoingRequests: async (userId: string) => {
    const requests = await FriendRequestModel.find({
      fromUserId: userId,
      status: "pending",
    }).sort({ createdAt: -1 });

    return requests.map(toFriendRequestJson);
  },

  acceptRequest: async (requestId: string, userId: string) => {
    const request = await FriendRequestModel.findOne({
      _id: requestId,
      toUserId: userId,
      status: "pending",
    });

    if (!request) {
      return null;
    }

    if (
      await BlocksService.isBlockedBetween(
        request.fromUserId.toString(),
        request.toUserId.toString()
      )
    ) {
      return { error: "blocked" as const };
    }

    const pair = friendshipPair(
      request.fromUserId.toString(),
      request.toUserId.toString()
    );
    const friendship = await FriendshipModel.findOneAndUpdate(pair, pair, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    request.status = "accepted";
    await request.save();

    return {
      request: toFriendRequestJson(request),
      friendship: toFriendshipJson(friendship),
    };
  },

  rejectRequest: async (requestId: string, userId: string) => {
    const request = await FriendRequestModel.findOneAndUpdate(
      {
        _id: requestId,
        toUserId: userId,
        status: "pending",
      },
      { status: "rejected" },
      { new: true, runValidators: true }
    );

    return request ? toFriendRequestJson(request) : null;
  },

  removeFriend: async (userId: string, friendId: string) => {
    const friendship = await FriendshipModel.findOneAndDelete(
      friendshipPair(userId, friendId)
    );

    return Boolean(friendship);
  },

  friendships: async (userId: string) => {
    const friendships = await FriendshipModel.find({
      $or: [{ userA: userId }, { userB: userId }],
    }).sort({ createdAt: -1 });

    const blockedIds = new Set([
      ...(await BlocksService.blockedUserIds(userId)),
      ...(await BlocksService.blockedByUserIds(userId)),
    ]);

    return friendships
      .filter((friendship) => {
        const userA = friendship.userA.toString();
        const userB = friendship.userB.toString();
        const friendId = userA === userId ? userB : userA;
        return !blockedIds.has(friendId);
      })
      .map(toFriendshipJson);
  },

  friendIds: async (userId: string) => {
    const friendships = await FriendshipModel.find({
      $or: [{ userA: userId }, { userB: userId }],
    }).select("userA userB");

    const blockedIds = new Set([
      ...(await BlocksService.blockedUserIds(userId)),
      ...(await BlocksService.blockedByUserIds(userId)),
    ]);

    return friendships
      .map((friendship) => {
        const userA = friendship.userA.toString();
        const userB = friendship.userB.toString();
        return userA === userId ? userB : userA;
      })
      .filter((friendId) => !blockedIds.has(friendId));
  },
};
