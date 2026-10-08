import { connectRedis } from "../../infrastructure/redis/redis.client.js";
import { AppError } from "../errors/AppError.js";
import { envConfig } from "../../config/index.js";
import {
  logSecurityAuditEvent,
  SecurityEventTypes,
  SecuritySeverityLevels,
} from "../utils/security-audit-logger.util.js";

const getClientIpAddress = (request) => {
  const forwardedHeader = request.headers["x-forwarded-for"];

  if (typeof forwardedHeader === "string") {
    return forwardedHeader.split(",")[0].trim();
  }

  return request.ip || request.socket?.remoteAddress || "unknown_ip";
};

const isLoopbackIpAddress = (ipAddress) => {
  return (
    ipAddress === "127.0.0.1" ||
    ipAddress === "::1" ||
    ipAddress === "::ffff:127.0.0.1" ||
    ipAddress === "localhost" ||
    ipAddress === "unknown_ip"
  );
};

export const createAuthenticationRateLimiter = (customOptions = {}) => {
  const maximumAttemptsAllowed =
    customOptions.maximumAttemptsAllowed ||
    envConfig.security?.authRateLimitMaxAttempts ||
    5;

  const windowDurationInMinutes =
    customOptions.windowDurationInMinutes ||
    envConfig.security?.authRateLimitWindowMinutes ||
    15;

  const windowDurationInSeconds = windowDurationInMinutes * 60;

  return async (request, response, next) => {
    try {
      const clientIpAddress = getClientIpAddress(request);
      const isDevMode =
        process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
      const isRateLimitDisabled =
        process.env.DISABLE_AUTH_RATE_LIMIT === "true";
      const isForceEnforced =
        request.headers["x-enforce-rate-limit"] === "true";

      // Bypass rate limiting for local development loopback unless explicitly force-enforced
      if (
        (isDevMode || isRateLimitDisabled) &&
        isLoopbackIpAddress(clientIpAddress) &&
        !isForceEnforced
      ) {
        return next();
      }

      let redisClient;
      try {
        redisClient = await connectRedis();
      } catch (redisErr) {
        console.warn(
          "[REDIS AUTH RATE LIMIT FAIL OPEN]",
          redisErr?.message || redisErr,
        );
        return next();
      }

      if (!redisClient || !redisClient.isOpen) {
        console.warn("[REDIS AUTH RATE LIMIT FAIL OPEN] Client is not ready");
        return next();
      }

      const redisRateLimitKey = `auth:rate_limit:${clientIpAddress}`;

      const currentAttemptCount = await redisClient.incr(redisRateLimitKey);

      if (currentAttemptCount === 1) {
        await redisClient.expire(redisRateLimitKey, windowDurationInSeconds);
      }

      if (currentAttemptCount > maximumAttemptsAllowed) {
        logSecurityAuditEvent({
          eventTypeString: SecurityEventTypes.AUTH_RATE_LIMIT_EXCEEDED,
          severityLevelString: SecuritySeverityLevels.HIGH,
          clientIpAddressString: clientIpAddress,
          requestEndpointString: request.originalUrl || request.path,
          incidentDetailsObject: {
            currentAttemptCount,
            maximumAttemptsAllowed,
            windowDurationInMinutes,
          },
        });

        throw new AppError(
          `Too many failed login attempts. Please try again after ${windowDurationInMinutes} minutes.`,
          429,
          "TOO_MANY_LOGIN_ATTEMPTS",
        );
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      console.warn(
        `[REDIS AUTH RATE LIMIT FAIL OPEN] ${error?.message || error}. Failing open for authentication request.`,
      );
      next();
    }
  };
};

export const clearAuthenticationRateLimit = async (clientIpAddress) => {
  try {
    const redisClient = await connectRedis();
    const redisRateLimitKey = `auth:rate_limit:${clientIpAddress}`;
    await redisClient.del(redisRateLimitKey);
  } catch (error) {
    console.error("Failed to clear rate limit key:", error);
  }
};
