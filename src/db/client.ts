import mongoose from "mongoose";
import { env } from "@/config/env";

export async function connectDb(): Promise<void> {
  await mongoose.connect(env.databaseUrl, { dbName: env.mongoDbName });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
