import { Elysia } from "elysia";
import mongoose from "mongoose";
import { isDuplicateKeyError } from "@/lib/errors";

export const errorsPlugin = new Elysia({ name: "errors" }).onError(
  ({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 422;
      return { error: error.message };
    }

    if (error instanceof mongoose.Error.CastError) {
      set.status = 400;
      return { error: "Invalid id" };
    }

    if (error instanceof mongoose.Error.ValidationError) {
      set.status = 400;
      return { error: error.message };
    }

    if (isDuplicateKeyError(error)) {
      set.status = 409;
      return { error: "Resource already exists" };
    }

    set.status = 500;
    return { error: "Internal server error" };
  }
);
