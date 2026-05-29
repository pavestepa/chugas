import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const communitySchema = new Schema(
  {
    nickname: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 32,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 2000 },
    bio: { type: String, default: "", maxlength: 2000 },
    avatarUrl: { type: String, default: "" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    access: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      required: true,
    },
    moderatorIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    membersCount: { type: Number, default: 0, min: 0 },
  },
  {
    ...defaultSchemaOptions,
    collection: "communities",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

communitySchema.index({ nickname: 1 }, { unique: true });
communitySchema.index({ title: "text", nickname: "text", bio: "text" });

export type CommunityDocument = InferSchemaType<typeof communitySchema> & {
  _id: string;
  nickname: string;
  ownerId: string;
  access: "open" | "closed";
  moderatorIds: string[];
  createdAt: Date;
};

export const CommunityModel = model("Community", communitySchema);
export const toCommunityJson = toJson<CommunityDocument>;
