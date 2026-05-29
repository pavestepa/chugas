import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const friendshipSchema = new Schema(
  {
    userA: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userB: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    ...defaultSchemaOptions,
    collection: "friendships",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

friendshipSchema.index({ userA: 1, userB: 1 }, { unique: true });
friendshipSchema.index({ userA: 1, createdAt: -1 });
friendshipSchema.index({ userB: 1, createdAt: -1 });

export type FriendshipDocument = InferSchemaType<typeof friendshipSchema> & {
  _id: string;
  userA: string;
  userB: string;
  createdAt: Date;
};

export const FriendshipModel = model("Friendship", friendshipSchema);
export const toFriendshipJson = toJson<FriendshipDocument>;
