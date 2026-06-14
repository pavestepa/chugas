import { FollowRequestModel } from "@/schemas/follow-request.schema";
import { FollowModel } from "@/schemas/follow.schema";
import { toUserBlockJson, UserBlockModel } from "@/schemas/user-block.schema";
import { UserModel } from "@/schemas/user.schema";

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

    const follows = await FollowModel.find({
      $or: [
        { followerId: blockerId, followingId: blockedId },
        { followerId: blockedId, followingId: blockerId },
      ],
    }).select("followerId followingId");

    await Promise.all([
      follows.length > 0
        ? FollowModel.deleteMany({
            _id: { $in: follows.map((follow) => follow._id) },
          })
        : Promise.resolve(),
      FollowRequestModel.deleteMany({
        status: "pending",
        $or: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      }),
    ]);

    if (follows.length > 0) {
      await Promise.all(
        follows.flatMap((follow) => [
          UserModel.updateOne(
            { _id: follow.followerId },
            { $inc: { followingCount: -1 } }
          ),
          UserModel.updateOne(
            { _id: follow.followingId },
            { $inc: { followersCount: -1 } }
          ),
        ])
      );
    }

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
