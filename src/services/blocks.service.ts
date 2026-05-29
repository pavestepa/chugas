import { FriendRequestModel } from "@/schemas/friend-request.schema";
import { FriendshipModel } from "@/schemas/friendship.schema";
import { toUserBlockJson, UserBlockModel } from "@/schemas/user-block.schema";

function friendshipPair(userId: string, friendId: string) {
  return userId < friendId
    ? { userA: userId, userB: friendId }
    : { userA: friendId, userB: userId };
}

export const BlocksService = {
  block: async (blockerId: string, blockedId: string) => {
    if (blockerId === blockedId) {
      return { error: "self_block" as const };
    }

    const block = await UserBlockModel.findOneAndUpdate(
      { blockerId, blockedId },
      { blockerId, blockedId },
      { upsert: true, new: true, runValidators: true }
    );

    await Promise.all([
      FriendshipModel.findOneAndDelete(friendshipPair(blockerId, blockedId)),
      FriendRequestModel.deleteMany({
        status: "pending",
        $or: [
          { fromUserId: blockerId, toUserId: blockedId },
          { fromUserId: blockedId, toUserId: blockerId },
        ],
      }),
    ]);

    return { block: toUserBlockJson(block) };
  },

  unblock: async (blockerId: string, blockedId: string) => {
    const block = await UserBlockModel.findOneAndDelete({
      blockerId,
      blockedId,
    });

    return Boolean(block);
  },

  blockedUsers: async (blockerId: string) => {
    const blocks = await UserBlockModel.find({ blockerId }).sort({
      createdAt: -1,
    });

    return blocks.map(toUserBlockJson);
  },

  blockedUserIds: async (blockerId: string) => {
    const blocks = await UserBlockModel.find({ blockerId }).select("blockedId");
    return blocks.map((block) => block.blockedId.toString());
  },

  isBlockedBetween: async (userA: string, userB: string) => {
    return Boolean(
      await UserBlockModel.exists({
        $or: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      })
    );
  },

  blockedByUserIds: async (userId: string) => {
    const blocks = await UserBlockModel.find({ blockedId: userId }).select(
      "blockerId"
    );
    return blocks.map((block) => block.blockerId.toString());
  },
};
