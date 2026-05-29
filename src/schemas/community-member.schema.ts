import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const communityMemberSchema = new Schema(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["member", "moderator", "owner"],
      default: "member",
      required: true,
    },
  },
  {
    ...defaultSchemaOptions,
    collection: "community_members",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

communityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });

export type CommunityMemberDocument = InferSchemaType<
  typeof communityMemberSchema
> & {
  _id: string;
  communityId: string;
  userId: string;
  role: "member" | "moderator" | "owner";
  createdAt: Date;
};

export const CommunityMemberModel = model(
  "CommunityMember",
  communityMemberSchema
);
export const toCommunityMemberJson = toJson<CommunityMemberDocument>;
