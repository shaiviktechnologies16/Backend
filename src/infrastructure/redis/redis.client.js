import { createClient } from "redis";

const rawRedisUrl =
  process.env.REDIS_URL ||
  (process.env.REDIS_HOST
    ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`
    : null);

const isPlaceholder =
  Boolean(rawRedisUrl) &&
  (rawRedisUrl.includes("your-redis-host") ||
    rawRedisUrl.includes("xxxx@") ||
    rawRedisUrl.includes("example.com"));

const redisUrl = isPlaceholder ? null : rawRedisUrl;

export const redisClient = redisUrl
  ? createClient({
      url: redisUrl,
      socket: {
        keepAlive: 10000,
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.warn(
              "[REDIS] Maximum reconnection attempts (5) reached. Halting auto-reconnect.",
            );
            return new Error("Redis reconnection limit reached");
          }
          const delay = Math.min(retries * 300, 2000);
          return delay;
        },
      },
    })
  : null;

if (redisClient) {
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
}

export const connectRedis = async () => {
  if (!redisClient) {
    return null;
  }

  if (!redisClient.isOpen && !redisClient.isConnecting) {
    try {
      const connectPromise = redisClient.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis connection timed out (3s)")), 3000),
      );
      await Promise.race([connectPromise, timeoutPromise]);
    } catch (err) {
      console.warn("[REDIS CONNECT WARNING]", err?.message || err);
      console.warn("ℹ️ Continuing backend startup without blocking HTTP services.");
    }
  }

  return redisClient;
};
