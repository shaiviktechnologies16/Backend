/**
 * TTS Demo Guard Service
 *
 * Implements server-side abuse protection and quota controls for the public
 * AI Voice Studio demo:
 * 1. 500-character maximum per generation.
 * 2. Configurable per-visitor daily request limit (default: 5).
 * 3. Configurable global daily request cap (default: 40) to protect OpenRouter free quota.
 * 4. Concurrency limit (default: 1 in-flight generation).
 * 5. Provider quota exhaustion detection with immediate fail-fast (no retries).
 * 6. Concurrency-safe atomic reservation with automatic daily UTC reset.
 */

export class TtsDemoGuardService {
  constructor(options = {}) {
    this.maxCharacters = Number(
      process.env.TTS_DEMO_MAX_CHARS || options.maxCharacters || 500,
    );
    this.globalDailyLimit = Number(
      process.env.TTS_DEMO_GLOBAL_DAILY_LIMIT ||
        options.globalDailyLimit ||
        40,
    );
    this.visitorDailyLimit = Number(
      process.env.TTS_DEMO_VISITOR_DAILY_LIMIT ||
        options.visitorDailyLimit ||
        5,
    );
    this.maxConcurrency = Number(
      process.env.TTS_DEMO_MAX_CONCURRENCY || options.maxConcurrency || 1,
    );

    this.activeRequests = 0;
    this.dailyGlobalCount = 0;
    this.dailyVisitorCounts = new Map();
    this.currentDayKey = this._getUtcDayKey();
    this.providerExhaustedUntil = null;
    this.providerExhaustionReason = null;
  }

  _getUtcDayKey() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  }

  _getMsUntilNextUtcMidnight() {
    const now = new Date();
    const nextMidnight = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    );
    return Math.max(1000, nextMidnight.getTime() - now.getTime());
  }

  _checkAndResetDay() {
    const today = this._getUtcDayKey();
    if (this.currentDayKey !== today) {
      this.currentDayKey = today;
      this.dailyGlobalCount = 0;
      this.dailyVisitorCounts.clear();
      this.providerExhaustedUntil = null;
      this.providerExhaustionReason = null;
    } else if (
      this.providerExhaustedUntil &&
      Date.now() > this.providerExhaustedUntil
    ) {
      this.providerExhaustedUntil = null;
      this.providerExhaustionReason = null;
    }
  }

  getStatus(visitorId = "default") {
    this._checkAndResetDay();

    const isExhausted =
      Boolean(this.providerExhaustedUntil) &&
      Date.now() < this.providerExhaustedUntil;
    const globalRemaining = Math.max(
      0,
      this.globalDailyLimit - this.dailyGlobalCount,
    );
    const visitorCount = this.dailyVisitorCounts.get(visitorId) || 0;
    const visitorRemaining = Math.max(
      0,
      this.visitorDailyLimit - visitorCount,
    );

    const isAvailable =
      !isExhausted && globalRemaining > 0 && visitorRemaining > 0;

    return {
      isAvailable,
      maxCharacters: this.maxCharacters,
      visitorRemaining,
      visitorLimit: this.visitorDailyLimit,
      globalRemaining,
      globalLimit: this.globalDailyLimit,
      activeRequests: this.activeRequests,
      isProviderExhausted: isExhausted,
      exhaustionReason: isExhausted ? this.providerExhaustionReason : null,
      resetsInMs: this._getMsUntilNextUtcMidnight(),
    };
  }

  /**
   * Attempts to atomically reserve a slot for generation.
   * Throws an object with { statusCode, code, message } if not allowed.
   */
  reserve(visitorId = "default", textLength = 0) {
    this._checkAndResetDay();

    // 1. Text character limit
    if (textLength > this.maxCharacters) {
      const err = new Error(
        `Input text exceeds maximum allowed limit of ${this.maxCharacters} characters for the public demo (received ${textLength} characters).`,
      );
      err.statusCode = 400;
      err.code = "TEXT_TOO_LONG";
      throw err;
    }

    // 2. Provider daily quota exhaustion check
    if (
      this.providerExhaustedUntil &&
      Date.now() < this.providerExhaustedUntil
    ) {
      const err = new Error(
        this.providerExhaustionReason ||
          "The daily demo generation quota has been exhausted. Please check back tomorrow.",
      );
      err.statusCode = 429;
      err.code = "PROVIDER_QUOTA_EXHAUSTED";
      err.retryAfterMs = this._getMsUntilNextUtcMidnight();
      throw err;
    }

    // 3. Concurrency check
    if (this.activeRequests >= this.maxConcurrency) {
      const err = new Error(
        "Another voice generation is currently in progress. Please wait a moment and try again.",
      );
      err.statusCode = 429;
      err.code = "CONCURRENCY_LIMIT_REACHED";
      throw err;
    }

    // 4. Global daily limit
    if (this.dailyGlobalCount >= this.globalDailyLimit) {
      const err = new Error(
        "The daily global demo generation limit has been reached. Please check back tomorrow.",
      );
      err.statusCode = 429;
      err.code = "GLOBAL_DAILY_LIMIT_EXCEEDED";
      err.retryAfterMs = this._getMsUntilNextUtcMidnight();
      throw err;
    }

    // 5. Visitor daily limit
    const visitorCount = this.dailyVisitorCounts.get(visitorId) || 0;
    if (visitorCount >= this.visitorDailyLimit) {
      const err = new Error(
        `You have reached your daily limit of ${this.visitorDailyLimit} voice generations. Please check back tomorrow.`,
      );
      err.statusCode = 429;
      err.code = "VISITOR_DAILY_LIMIT_EXCEEDED";
      err.retryAfterMs = this._getMsUntilNextUtcMidnight();
      throw err;
    }

    // Atomic reservation
    this.activeRequests += 1;
    this.dailyGlobalCount += 1;
    this.dailyVisitorCounts.set(visitorId, visitorCount + 1);

    return {
      reserved: true,
      visitorRemaining: this.visitorDailyLimit - (visitorCount + 1),
      globalRemaining: this.globalDailyLimit - this.dailyGlobalCount,
    };
  }

  /**
   * Releases an in-flight request and updates provider health/quota status.
   */
  release(visitorId = "default", outcome = {}) {
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    const { success, providerExhausted, error, statusCode } = outcome;

    if (providerExhausted) {
      // Flag provider as exhausted until next UTC midnight
      const nextMidnight = new Date();
      nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
      nextMidnight.setUTCHours(0, 0, 0, 0);

      this.providerExhaustedUntil = nextMidnight.getTime();
      this.providerExhaustionReason =
        error?.message ||
        "The AI voice provider daily quota has been exceeded. Generation will resume tomorrow.";
      console.warn("[TTS_DEMO_GUARD] Provider quota marked as exhausted until:", nextMidnight.toISOString());
    }

    // If request failed before hitting provider or due to bad client input, refund visitor and global quota
    if (!success && !providerExhausted && statusCode && statusCode < 500) {
      this.dailyGlobalCount = Math.max(0, this.dailyGlobalCount - 1);
      const currentVisitorCount = this.dailyVisitorCounts.get(visitorId) || 0;
      this.dailyVisitorCounts.set(
        visitorId,
        Math.max(0, currentVisitorCount - 1),
      );
    }
  }

  /**
   * Helper to inspect error message/code and detect OpenRouter quota exhaustion.
   */
  isQuotaExhaustionError(error) {
    if (!error) return false;
    const msg = (error.message || "").toLowerCase();
    const code = error.statusCode || error.status || 0;

    return (
      code === 402 ||
      code === 429 ||
      msg.includes("free-models-per-day") ||
      msg.includes("rate limit exceeded") ||
      msg.includes("credits") ||
      msg.includes("insufficient") ||
      msg.includes("quota exceeded")
    );
  }
}

