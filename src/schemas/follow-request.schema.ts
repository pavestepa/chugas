import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const followRequestSchema = new Schema(
  {
    followerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    followingId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      required: true,
    },
  },
  {
    ...defaultSchemaOptions,
    collection: "follow_requests",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

followRequestSchema.index(
  { followerId: 1, followingId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);
followRequestSchema.index({ followingId: 1, status: 1, createdAt: -1 });
followRequestSchema.index({ followerId: 1, status: 1, createdAt: -1 });

export type FollowRequestDocument = InferSchemaType<
  typeof followRequestSchema
> & {
  _id: string;
  followerId: string;
  followingId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
};

export const FollowRequestModel = model("FollowRequest", followRequestSchema);
export const toFollowRequestJson = toJson<FollowRequestDocument>;
