import { Schema, model, type InferSchemaType } from "mongoose";
import { defaultSchemaOptions, toJson } from "@/lib/mongoose";

const locationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
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
  },
  {
    ...defaultSchemaOptions,
    collection: "locations",
    timestamps: { createdAt: false, updatedAt: true },
  }
);

locationSchema.index({ location: "2dsphere" });

export type LocationDocument = InferSchemaType<typeof locationSchema> & {
  _id: string;
  userId: string;
  updatedAt: Date;
};

export const LocationModel = model("Location", locationSchema);
export const toLocationJson = toJson<LocationDocument>;
