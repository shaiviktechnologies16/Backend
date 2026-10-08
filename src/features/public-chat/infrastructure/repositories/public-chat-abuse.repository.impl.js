import { PublicChatAbuseRepository } from "../../domain/repositories/public-chat-abuse.repository.js";
import { connectRedis } from "../../../../infrastructure/redis/redis.client.js";

const RATE_LIMIT = 10;
const RATE_WINDOW_SECONDS = 60;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export class PublicChatAbuseRepositoryImpl extends PublicChatAbuseRepository {
  async checkAndConsume({ organizationId, ipHash, dailyVisitorLimit }) {
    const effectiveDailyLimit =
      dailyVisitorLimit !== null &&
      dailyVisitorLimit !== undefined &&
      Number(dailyVisitorLimit) > 0
        ? Number(dailyVisitorLimit)
        : null;

    try {
      const redis = await connectRedis();

      if (!redis || !redis.isOpen) {
        console.warn(
          "[REDIS ABUSE CHECK FAIL OPEN] Redis client is not ready. Allowing request.",
        );
        return {
          rateLimitExceeded: false,
          dailyLimitExceeded: false,
          rateLimitRemaining: RATE_LIMIT,
          dailyRemaining: effectiveDailyLimit,
        };
      }

      const now = new Date();
      const istNow = new Date(now.getTime() + IST_OFFSET_MS);

      const year = istNow.getUTCFullYear();
      const month = String(istNow.getUTCMonth() + 1).padStart(2, "0");
      const day = String(istNow.getUTCDate()).padStart(2, "0");

      const istDate = `${year}-${month}-${day}`;

      const nextMidnightIST = new Date(
        Date.UTC(
          year,
          istNow.getUTCMonth(),
          istNow.getUTCDate() + 1,
          0,
          0,
          0,
          0,
        ) - IST_OFFSET_MS,
      );

      const secondsUntilNextMidnight = Math.max(
        1,
        Math.ceil((nextMidnightIST.getTime() - now.getTime()) / 1000),
      );

      const rateLimitKey = `public-chat:rate:${organizationId}:${ipHash}`;
      const dailyLimitKey = `public-chat:daily:${organizationId}:${ipHash}:${istDate}`;

      const rateCount = await redis.incr(rateLimitKey);

      if (rateCount === 1) {
        await redis.expire(rateLimitKey, RATE_WINDOW_SECONDS);
      }

      const dailyCount = await redis.incr(dailyLimitKey);

      if (dailyCount === 1) {
        await redis.expire(dailyLimitKey, secondsUntilNextMidnight);
      }

      return {
        rateLimitExceeded: rateCount > RATE_LIMIT,
        dailyLimitExceeded:
          effectiveDailyLimit !== null && dailyCount > effectiveDailyLimit,
        rateLimitRemaining: Math.max(0, RATE_LIMIT - rateCount),
        dailyRemaining:
          effectiveDailyLimit === null
            ? null
            : Math.max(0, effectiveDailyLimit - dailyCount),
      };
    } catch (error) {
      console.warn(
        `[REDIS ABUSE CHECK FAIL OPEN] Error checking Redis abuse limit: ${error?.message || error}. Failing open to preserve chat availability.`,
      );

      return {
        rateLimitExceeded: false,
        dailyLimitExceeded: false,
        rateLimitRemaining: RATE_LIMIT,
        dailyRemaining: effectiveDailyLimit,
      };
    }
  }
}
