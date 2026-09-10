import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not configured.");
}

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (error) => {
  console.error("[REDIS ERROR]", error);
});

redisClient.on("connect", () => {
  console.log("[REDIS] Connecting...");
});

redisClient.on("ready", () => {
  console.log("[REDIS] Ready");
});

redisClient.on("reconnecting", () => {
  console.log("[REDIS] Reconnecting...");
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
};
