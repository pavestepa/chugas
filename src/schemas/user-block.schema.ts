import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const userBlockSchema = new Schema(
  {
    blockerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    blockedId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    ...defaultSchemaOptions,
    collection: "user_blocks",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

userBlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
userBlockSchema.index({ blockerId: 1, createdAt: -1 });

export type UserBlockDocument = InferSchemaType<typeof userBlockSchema> & {
  _id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
};

export const UserBlockModel = model("UserBlock", userBlockSchema);
export const toUserBlockJson = toJson<UserBlockDocument>;
