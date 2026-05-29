import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const attachmentSchema = new Schema(
  {
    type: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const messageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 5000 },
    attachments: { type: [attachmentSchema], default: [] },
    expiresAt: { type: Date, required: true },
  },
  {
    ...defaultSchemaOptions,
    collection: "messages",
    timestamps: { createdAt: true, updatedAt: false },
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type MessageDocument = InferSchemaType<typeof messageSchema> & {
  _id: string;
  conversationId: string;
  senderId: string;
  createdAt: Date;
  expiresAt: Date;
};

export const MessageModel = model("Message", messageSchema);
export const toMessageJson = toJson<MessageDocument>;
