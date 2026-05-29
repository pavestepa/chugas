import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const conversationSchema = new Schema(
  {
    type: { type: String, enum: ["private", "group"], required: true },
    members: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: true,
    },
    lastMessageAt: { type: Date, default: Date.now },
  },
  {
    ...defaultSchemaOptions,
    collection: "conversations",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

conversationSchema.index({ members: 1, lastMessageAt: -1 });

export type ConversationDocument = InferSchemaType<
  typeof conversationSchema
> & {
  _id: string;
  members: string[];
  createdAt: Date;
};

export const ConversationModel = model("Conversation", conversationSchema);
export const toConversationJson = toJson<ConversationDocument>;
