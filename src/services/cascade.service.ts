import { CommentModel } from "@/schemas/comment.schema";
import { PostLikeModel } from "@/schemas/post-like.schema";
import { PostModel } from "@/schemas/post.schema";

export const CascadeService = {
  deletePost: async (postId: string) => {
    const post = await PostModel.findByIdAndDelete(postId);
    if (!post) {
      return false;
    }

    await Promise.all([
      CommentModel.deleteMany({ postId }),
      PostLikeModel.deleteMany({ postId }),
    ]);

    return true;
  },

  deleteCommunityPosts: async (communityId: string) => {
    const posts = await PostModel.find({ communityId }).select("_id");
    const postIds = posts.map((post) => post._id);

    await Promise.all([
      PostModel.deleteMany({ communityId }),
      CommentModel.deleteMany({ postId: { $in: postIds } }),
      PostLikeModel.deleteMany({ postId: { $in: postIds } }),
    ]);
  },
};
