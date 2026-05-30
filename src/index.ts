import { app } from "@/app";
import { env } from "@/config/env";
import { connectDb, disconnectDb } from "@/db/client";
import { disconnectRedis } from "@/db/redis";

await connectDb();

app.listen(env.port);

const hostname = app.server?.hostname ?? "localhost";
const serverPort = app.server?.port ?? env.port;

console.log(`🦊 chugas API: http://${hostname}:${String(serverPort)}`);
console.log(`📚 Swagger: http://${hostname}:${String(serverPort)}/swagger`);
console.log(
  `🔌 WebSocket: ws://${hostname}:${String(serverPort)}/ws?token=JWT`
);

async function shutdown(): Promise<void> {
  await Promise.all([disconnectDb(), disconnectRedis()]);
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
