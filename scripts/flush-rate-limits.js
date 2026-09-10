import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const flushRateLimits = async () => {
  try {
    const { connectRedis } =
      await import("../src/infrastructure/redis/redis.client.js");
    const redisClient = await connectRedis();

    const loopbackKeys = [
      "auth:rate_limit:127.0.0.1",
      "auth:rate_limit:::1",
      "auth:rate_limit:::ffff:127.0.0.1",
      "auth:rate_limit:unknown_ip",
      "auth:rate_limit:localhost",
    ];

    for (const key of loopbackKeys) {
      await redisClient.del(key);
    }

    const rateLimitKeys = await redisClient.keys("auth:rate_limit:*");
    if (rateLimitKeys && rateLimitKeys.length > 0) {
      for (const key of rateLimitKeys) {
        await redisClient.del(key);
      }
    }

    console.log(
      "Successfully cleared all authentication rate limits for local development.",
    );
    process.exit(0);
  } catch (error) {
    console.error("Failed to clear Redis rate limits:", error.message);
    process.exit(1);
  }
};

flushRateLimits();
