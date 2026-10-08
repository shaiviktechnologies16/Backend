import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not configured.");
}

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    keepAlive: 10000,
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 100, 3000);
      return delay;
    },
  },
});

redisClient.on("error", (error) => {
  console.error("[REDIS ERROR]", error?.message || error);
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
  if (!redisClient.isOpen && !redisClient.isConnecting) {
    try {
      await redisClient.connect();
    } catch (err) {
      console.error("[REDIS CONNECT ERROR]", err?.message || err);
    }
  }

  return redisClient;
};
