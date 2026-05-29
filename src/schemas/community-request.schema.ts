import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const communityRequestSchema = new Schema(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      required: true,
    },
  },
  {
    ...defaultSchemaOptions,
    collection: "community_requests",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

communityRequestSchema.index(
  { communityId: 1, fromUserId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);
communityRequestSchema.index({ communityId: 1, status: 1, createdAt: -1 });

export type CommunityRequestDocument = InferSchemaType<
  typeof communityRequestSchema
> & {
  _id: string;
  communityId: string;
  fromUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
};

export const CommunityRequestModel = model(
  "CommunityRequest",
  communityRequestSchema
);
export const toCommunityRequestJson = toJson<CommunityRequestDocument>;
