import { CommentModel, toCommentJson } from "@/schemas/comment.schema";

export const CommentsService = {
  create: async (input: { postId: string; authorId: string; text: string }) => {
    const comment = await CommentModel.create(input);
    return toCommentJson(comment);
  },

  listByPost: async (postId: string) => {
    const comments = await CommentModel.find({ postId }).sort({ createdAt: 1 });
    return comments.map(toCommentJson);
  },

  delete: async (id: string, authorId: string) => {
    const comment = await CommentModel.findOneAndDelete({ _id: id, authorId });
    if (!comment) {
      return false;
    }
    return true;
  },
};
