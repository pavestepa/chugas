import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const communityBanSchema = new Schema(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bannedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, default: "", maxlength: 500 },
  },
  {
    ...defaultSchemaOptions,
    collection: "community_bans",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

communityBanSchema.index({ communityId: 1, userId: 1 }, { unique: true });
communityBanSchema.index({ communityId: 1, createdAt: -1 });

export type CommunityBanDocument = InferSchemaType<
  typeof communityBanSchema
> & {
  _id: string;
  communityId: string;
  userId: string;
  bannedById: string;
  createdAt: Date;
};

export const CommunityBanModel = model("CommunityBan", communityBanSchema);
export const toCommunityBanJson = toJson<CommunityBanDocument>;
