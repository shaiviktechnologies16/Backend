import express from "express";

export function createPublicAnalyticsRoutes({ publicAnalyticsController }) {
  const router = express.Router();

  // Basic in-memory rate limiter per IP to prevent flood
  const rateLimitMap = new Map();
  const RATE_LIMIT_WINDOW_MS = 60_000;
  const MAX_REQUESTS_PER_WINDOW = 120;

  const publicRateLimiter = (req, res, next) => {
    const ip =
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress ||
      "unknown-ip";

    const now = Date.now();
    const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
    }

    entry.count += 1;
    rateLimitMap.set(ip, entry);

    // Housekeeping to prevent memory leak
    if (rateLimitMap.size > 10000) {
      for (const [key, val] of rateLimitMap.entries()) {
        if (now > val.resetAt) rateLimitMap.delete(key);
      }
    }

    if (entry.count > MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        success: false,
        error: "Too many tracking events. Please throttle requests.",
        code: "RATE_LIMIT_EXCEEDED",
      });
    }

    next();
  };

  // Support plain text / beacon payloads alongside json
  router.post(
    "/event",
    express.text({ type: ["text/plain", "application/json", "application/x-www-form-urlencoded"] }),
    publicRateLimiter,
    publicAnalyticsController.recordEvent,
  );

  router.post(
    "/collect",
    express.text({ type: ["text/plain", "application/json", "application/x-www-form-urlencoded"] }),
    publicRateLimiter,
    publicAnalyticsController.recordEvent,
  );

  return router;
}

