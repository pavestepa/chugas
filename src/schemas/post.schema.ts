import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const postSchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["public", "followers", "community"],
      required: true,
    },
    communityId: { type: Schema.Types.ObjectId, ref: "Community" },
    visibility: {
      type: String,
      enum: ["public", "followers", "community"],
      required: true,
    },
    text: { type: String, required: true, maxlength: 5000 },
    media: { type: [String], default: [] },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    expiresAt: { type: Date, required: true },
  },
  {
    ...defaultSchemaOptions,
    collection: "posts",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ communityId: 1, createdAt: -1 });
postSchema.index({ location: "2dsphere" });
postSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
postSchema.index({ communityId: 1, location: "2dsphere" });
postSchema.index({ authorId: 1, location: "2dsphere" });

export type PostDocument = InferSchemaType<typeof postSchema> & {
  _id: string;
  authorId: string;
  communityId?: string;
  type: "public" | "followers" | "community";
  visibility: "public" | "followers" | "community";
  createdAt: Date;
  expiresAt: Date;
};

export const PostModel = model("Post", postSchema);
export const toPostJson = toJson<PostDocument>;
