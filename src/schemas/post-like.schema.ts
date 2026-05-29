import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const postLikeSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    ...defaultSchemaOptions,
    collection: "post_likes",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

postLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export type PostLikeDocument = InferSchemaType<typeof postLikeSchema> & {
  _id: string;
  postId: string;
  userId: string;
  createdAt: Date;
};

export const PostLikeModel = model("PostLike", postLikeSchema);
export const toPostLikeJson = toJson<PostLikeDocument>;
