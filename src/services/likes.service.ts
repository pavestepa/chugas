import { PostLikeModel, toPostLikeJson } from "@/schemas/post-like.schema";

export const LikesService = {
  like: async (postId: string, userId: string) => {
    const like = await PostLikeModel.create({ postId, userId });
    return toPostLikeJson(like);
  },

  unlike: async (postId: string, userId: string) => {
    const like = await PostLikeModel.findOneAndDelete({ postId, userId });
    if (!like) {
      return false;
    }
    return true;
  },
};
