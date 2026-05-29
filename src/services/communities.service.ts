import {
  CommunityMemberModel,
  toCommunityMemberJson,
} from "@/schemas/community-member.schema";
import {
  CommunityBanModel,
  toCommunityBanJson,
} from "@/schemas/community-ban.schema";
import {
  CommunityRequestModel,
  toCommunityRequestJson,
} from "@/schemas/community-request.schema";
import { CommunityModel, toCommunityJson } from "@/schemas/community.schema";
import { PostModel } from "@/schemas/post.schema";
import { CascadeService } from "@/services/cascade.service";

export const CommunitiesService = {
  create: async (input: {
    nickname: string;
    title: string;
    description?: string;
    bio?: string;
    avatarUrl?: string;
    ownerId: string;
    access: "open" | "closed";
  }) => {
    const community = await CommunityModel.create({
      ...input,
      moderatorIds: [input.ownerId],
      membersCount: 1,
    });
    await CommunityMemberModel.create({
      communityId: community._id,
      userId: input.ownerId,
      role: "owner",
    });
    return toCommunityJson(community);
  },

  findById: async (id: string) => {
    const community = await CommunityModel.findById(id);
    return community ? toCommunityJson(community) : null;
  },

  join: async (communityId: string, userId: string) => {
    const community = await CommunityModel.findById(communityId);
    if (!community) {
      return { error: "not_found" as const };
    }

    if (await CommunitiesService.isBanned(communityId, userId)) {
      return { error: "banned" as const };
    }

    const existingMember = await CommunityMemberModel.findOne({
      communityId,
      userId,
    });
    if (existingMember) {
      return { error: "already_member" as const };
    }

    if (community.access === "closed") {
      const request = await CommunityRequestModel.findOneAndUpdate(
        { communityId, fromUserId: userId, status: "pending" },
        { communityId, fromUserId: userId, status: "pending" },
        { upsert: true, new: true, runValidators: true }
      );

      return { request: toCommunityRequestJson(request) };
    }

    const member = await CommunityMemberModel.create({ communityId, userId });
    await CommunityModel.findByIdAndUpdate(communityId, {
      $inc: { membersCount: 1 },
    });
    return { member: toCommunityMemberJson(member) };
  },

  leave: async (communityId: string, userId: string) => {
    if (await CommunitiesService.isOwner(communityId, userId)) {
      return { error: "owner_cannot_leave" as const };
    }

    const member = await CommunityMemberModel.findOneAndDelete({
      communityId,
      userId,
    });
    if (!member) {
      return { error: "not_found" as const };
    }
    await CommunityModel.findByIdAndUpdate(communityId, {
      $inc: { membersCount: -1 },
    });
    return { success: true as const };
  },

  isMember: async (communityId: string, userId: string) => {
    return Boolean(await CommunityMemberModel.exists({ communityId, userId }));
  },

  memberRole: async (communityId: string, userId: string) => {
    const member = await CommunityMemberModel.findOne({ communityId, userId });
    return member?.role ?? null;
  },

  isBanned: async (communityId: string, userId: string) => {
    return Boolean(await CommunityBanModel.exists({ communityId, userId }));
  },

  isModerator: async (communityId: string, userId: string) => {
    const community = await CommunityModel.findOne({
      _id: communityId,
      $or: [{ ownerId: userId }, { moderatorIds: userId }],
    });

    return Boolean(community);
  },

  isOwner: async (communityId: string, userId: string) => {
    return Boolean(
      await CommunityModel.exists({ _id: communityId, ownerId: userId })
    );
  },

  update: async (
    communityId: string,
    actorId: string,
    input: {
      title?: string;
      bio?: string;
      description?: string;
      avatarUrl?: string;
      access?: "open" | "closed";
      nickname?: string;
    }
  ) => {
    const isModerator = await CommunitiesService.isModerator(
      communityId,
      actorId
    );
    if (!isModerator) {
      return { error: "forbidden" as const };
    }

    if (
      (input.nickname !== undefined || input.access !== undefined) &&
      !(await CommunitiesService.isOwner(communityId, actorId))
    ) {
      return { error: "owner_required" as const };
    }

    const community = await CommunityModel.findByIdAndUpdate(
      communityId,
      input,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!community) {
      return { error: "not_found" as const };
    }

    return { community: toCommunityJson(community) };
  },

  requests: async (communityId: string, moderatorId: string) => {
    if (!(await CommunitiesService.isModerator(communityId, moderatorId))) {
      return { error: "forbidden" as const };
    }

    const requests = await CommunityRequestModel.find({
      communityId,
      status: "pending",
    }).sort({ createdAt: -1 });

    return { requests: requests.map(toCommunityRequestJson) };
  },

  acceptRequest: async (
    communityId: string,
    requestId: string,
    moderatorId: string
  ) => {
    if (!(await CommunitiesService.isModerator(communityId, moderatorId))) {
      return { error: "forbidden" as const };
    }

    const request = await CommunityRequestModel.findOne({
      _id: requestId,
      communityId,
      status: "pending",
    });
    if (!request) {
      return { error: "not_found" as const };
    }

    const member = await CommunityMemberModel.findOneAndUpdate(
      { communityId, userId: request.fromUserId },
      { communityId, userId: request.fromUserId, role: "member" },
      { upsert: true, new: true, runValidators: true }
    );

    request.status = "accepted";
    await request.save();
    await CommunityModel.findByIdAndUpdate(communityId, {
      $inc: { membersCount: 1 },
    });

    return {
      request: toCommunityRequestJson(request),
      member: toCommunityMemberJson(member),
    };
  },

  rejectRequest: async (
    communityId: string,
    requestId: string,
    moderatorId: string
  ) => {
    if (!(await CommunitiesService.isModerator(communityId, moderatorId))) {
      return { error: "forbidden" as const };
    }

    const request = await CommunityRequestModel.findOneAndUpdate(
      { _id: requestId, communityId, status: "pending" },
      { status: "rejected" },
      { new: true, runValidators: true }
    );
    if (!request) {
      return { error: "not_found" as const };
    }

    return { request: toCommunityRequestJson(request) };
  },

  addModerator: async (
    communityId: string,
    targetUserId: string,
    ownerId: string
  ) => {
    if (!(await CommunitiesService.isOwner(communityId, ownerId))) {
      return { error: "forbidden" as const };
    }

    const member = await CommunityMemberModel.findOneAndUpdate(
      { communityId, userId: targetUserId },
      { role: "moderator" },
      { new: true, runValidators: true }
    );
    if (!member) {
      return { error: "not_found" as const };
    }

    const community = await CommunityModel.findByIdAndUpdate(
      communityId,
      { $addToSet: { moderatorIds: targetUserId } },
      { new: true, runValidators: true }
    );

    return {
      community: community ? toCommunityJson(community) : null,
      member: toCommunityMemberJson(member),
    };
  },

  removeModerator: async (
    communityId: string,
    targetUserId: string,
    ownerId: string
  ) => {
    if (!(await CommunitiesService.isOwner(communityId, ownerId))) {
      return { error: "forbidden" as const };
    }

    const community = await CommunityModel.findOne({
      _id: communityId,
      ownerId,
    });
    if (!community || community.ownerId.toString() === targetUserId) {
      return { error: "not_found" as const };
    }

    const member = await CommunityMemberModel.findOneAndUpdate(
      { communityId, userId: targetUserId, role: "moderator" },
      { role: "member" },
      { new: true, runValidators: true }
    );
    if (!member) {
      return { error: "not_found" as const };
    }

    community.moderatorIds = community.moderatorIds.filter(
      (moderatorId) => moderatorId.toString() !== targetUserId
    );
    await community.save();

    return {
      community: toCommunityJson(community),
      member: toCommunityMemberJson(member),
    };
  },

  banUser: async (
    communityId: string,
    targetUserId: string,
    actorId: string,
    reason?: string
  ) => {
    const actorRole = await CommunitiesService.memberRole(communityId, actorId);
    if (actorRole !== "owner" && actorRole !== "moderator") {
      return { error: "forbidden" as const };
    }

    const targetRole = await CommunitiesService.memberRole(
      communityId,
      targetUserId
    );
    if (targetRole === "owner") {
      return { error: "cannot_ban_owner" as const };
    }

    if (targetRole === "moderator" && actorRole !== "owner") {
      return { error: "cannot_ban_moderator" as const };
    }

    const ban = await CommunityBanModel.findOneAndUpdate(
      { communityId, userId: targetUserId },
      {
        communityId,
        userId: targetUserId,
        bannedById: actorId,
        reason: reason ?? "",
      },
      { upsert: true, new: true, runValidators: true }
    );

    const member = await CommunityMemberModel.findOneAndDelete({
      communityId,
      userId: targetUserId,
    });
    if (member) {
      await CommunityModel.findByIdAndUpdate(communityId, {
        $inc: { membersCount: -1 },
        $pull: { moderatorIds: targetUserId },
      });
    }

    return { ban: toCommunityBanJson(ban) };
  },

  unbanUser: async (
    communityId: string,
    targetUserId: string,
    actorId: string
  ) => {
    if (!(await CommunitiesService.isModerator(communityId, actorId))) {
      return { error: "forbidden" as const };
    }

    const ban = await CommunityBanModel.findOneAndDelete({
      communityId,
      userId: targetUserId,
    });
    if (!ban) {
      return { error: "not_found" as const };
    }

    return { success: true as const };
  },

  bans: async (communityId: string, actorId: string) => {
    if (!(await CommunitiesService.isModerator(communityId, actorId))) {
      return { error: "forbidden" as const };
    }

    const bans = await CommunityBanModel.find({ communityId }).sort({
      createdAt: -1,
    });
    return { bans: bans.map(toCommunityBanJson) };
  },

  deletePost: async (communityId: string, postId: string, actorId: string) => {
    if (!(await CommunitiesService.isModerator(communityId, actorId))) {
      return { error: "forbidden" as const };
    }

    const post = await PostModel.findOne({
      _id: postId,
      communityId,
    }).select("_id");
    if (!post) {
      return { error: "not_found" as const };
    }

    await CascadeService.deletePost(postId);
    return { success: true as const };
  },

  deleteCommunity: async (communityId: string, ownerId: string) => {
    if (!(await CommunitiesService.isOwner(communityId, ownerId))) {
      return { error: "forbidden" as const };
    }

    const community = await CommunityModel.findOneAndDelete({
      _id: communityId,
      ownerId,
    });
    if (!community) {
      return { error: "not_found" as const };
    }

    await Promise.all([
      CommunityMemberModel.deleteMany({ communityId }),
      CommunityRequestModel.deleteMany({ communityId }),
      CommunityBanModel.deleteMany({ communityId }),
      CascadeService.deleteCommunityPosts(communityId),
    ]);

    return { success: true as const };
  },
};
