import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    telegramId: { type: String, unique: true, sparse: true },
    telegramUsername: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 500 },
  },
  {
    ...defaultSchemaOptions,
    collection: "users",
  }
);

userSchema.index({ username: "text" });

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const UserModel = model("User", userSchema);
export const toUserJson = toJson<UserDocument>;
