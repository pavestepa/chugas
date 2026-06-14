import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const followSchema = new Schema(
  {
    followerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    followingId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    ...defaultSchemaOptions,
    collection: "follows",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followSchema.index({ followerId: 1, createdAt: -1 });
followSchema.index({ followingId: 1, createdAt: -1 });

export type FollowDocument = InferSchemaType<typeof followSchema> & {
  _id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
};

export const FollowModel = model("Follow", followSchema);
export const toFollowJson = toJson<FollowDocument>;
