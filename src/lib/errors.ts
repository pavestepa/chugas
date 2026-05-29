import mongoose from "mongoose";

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof mongoose.mongo.MongoServerError && error.code === 11000
  );
}

export function duplicateKeyResponse() {
  return { error: "Resource already exists" } as const;
}
