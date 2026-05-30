import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, jsonTransform, toJson } from "@/lib/mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 500 },
  },
  {
    ...defaultSchemaOptions,
    collection: "users",
    toJSON: {
      transform(_doc, ret) {
        const transformed = jsonTransform(_doc, ret);
        delete transformed.passwordHash;
        return transformed;
      },
    },
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
