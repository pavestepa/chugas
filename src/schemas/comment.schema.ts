import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const commentSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 2000 },
  },
  {
    ...defaultSchemaOptions,
    collection: "comments",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export type CommentDocument = InferSchemaType<typeof commentSchema> & {
  _id: string;
  postId: string;
  authorId: string;
  createdAt: Date;
};

export const CommentModel = model("Comment", commentSchema);
export const toCommentJson = toJson<CommentDocument>;
