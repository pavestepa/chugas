import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const friendRequestSchema = new Schema(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      required: true,
    },
  },
  {
    ...defaultSchemaOptions,
    collection: "friend_requests",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

friendRequestSchema.index(
  { fromUserId: 1, toUserId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);
friendRequestSchema.index({ toUserId: 1, status: 1, createdAt: -1 });
friendRequestSchema.index({ fromUserId: 1, status: 1, createdAt: -1 });

export type FriendRequestDocument = InferSchemaType<
  typeof friendRequestSchema
> & {
  _id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
};

export const FriendRequestModel = model("FriendRequest", friendRequestSchema);
export const toFriendRequestJson = toJson<FriendRequestDocument>;
