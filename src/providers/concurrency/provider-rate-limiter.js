import { ProviderError } from "../../common/errors/ProviderError.js";

const LUA_ACQUIRE_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local maxRequests = tonumber(ARGV[3])
local requestId = ARGV[4]
local pauseKey = key .. ':paused_until'

-- Authoritative Redis server time: ensures consistent time source across all backend instances
local ok, redisTime = pcall(redis.call, 'TIME')
if ok and redisTime and #redisTime >= 2 then
  now = tonumber(redisTime[1]) * 1000 + math.floor(tonumber(redisTime[2]) / 1000)
end

-- Check if upstream is paused (e.g. Retry-After)
local pausedUntil = tonumber(redis.call('GET', pauseKey) or '0')
if pausedUntil > now then
  return { 0, pausedUntil - now, 0 }
end

-- Clean expired timestamps older than now - windowMs
local clearBefore = now - windowMs
redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

-- Count current requests in sliding window
local currentCount = redis.call('ZCARD', key)

if currentCount < maxRequests then
  -- Token available! Add this request
  redis.call('ZADD', key, now, requestId)
  redis.call('PEXPIRE', key, math.floor(windowMs * 2))
  return { 1, 0, currentCount + 1 }
else
  -- Window is full! Find the oldest element to calculate exact wait time
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local waitMs = windowMs
  if oldest and #oldest >= 2 then
    local oldestTime = tonumber(oldest[2])
    waitMs = math.max(0, (oldestTime + windowMs) - now)
  end
  return { 0, waitMs, currentCount }
end
`;

const LUA_REFUND_SCRIPT = `
local key = KEYS[1]
local requestId = ARGV[1]
return redis.call('ZREM', key, requestId)
`;

const LUA_PAUSE_SCRIPT = `
local pauseKey = KEYS[1] .. ':paused_until'
local resumeAt = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local ok, redisTime = pcall(redis.call, 'TIME')
if ok and redisTime and #redisTime >= 2 then
  now = tonumber(redisTime[1]) * 1000 + math.floor(tonumber(redisTime[2]) / 1000)
end
local currentPaused = tonumber(redis.call('GET', pauseKey) or '0')
if resumeAt > currentPaused then
  local ttl = math.max(1000, resumeAt - now)
  redis.call('SET', pauseKey, tostring(resumeAt), 'PX', ttl)
end
return 1
`;

/**
 * ProviderRateLimiter
 *
 * Implements a distributed sliding-window rate limiter using Redis atomic Lua scripts,
 * with graceful in-memory fallback, queueing, and AbortSignal support.
 *
 * Strictly enforces third-party provider request-per-minute (RPM) limits across
 * multiple backend instances (e.g. OpenRouter 20 RPM across Docker Compose / PM2 replicas).
 */
export class ProviderRateLimiter {
  constructor({
    name = "default-rate-limiter",
    requestsPerMinute = 20,
    windowMs = 60000,
    maxWaitMs = 25000,
    maxQueueSize = 50,
    redisClient = null,
    redisKeyPrefix = "shaivik:ratelimit:provider",
    failPolicy = process.env.REDIS_RATELIMIT_FAIL_POLICY || "fail_closed", // "fail_closed" (strictly preserves provider limit) or "local_fallback"
    clock = { now: () => Date.now() },
  } = {}) {
    this.name = name;
    this.requestsPerMinute = Math.max(1, Number(requestsPerMinute) || 20);
    this.windowMs = Math.max(1000, Number(windowMs) || 60000);
    this.maxWaitMs = Math.max(1000, Number(maxWaitMs) || 25000);
    this.maxQueueSize = Math.max(0, Number(maxQueueSize) || 50);
    this.redisClient = redisClient;
    this.redisKey = `${redisKeyPrefix}:${this.name}`;
    this.failPolicy = failPolicy;
    this.clock = clock;

    // Local in-memory structures (used when Redis is not configured or in fallback mode)
    this.timestamps = [];
    this.queue = [];
    this.pausedUntil = 0;
    this.drainTimeoutId = null;

    this.metrics = {
      totalAcquired: 0,
      totalRejected: 0,
      totalTimedOut: 0,
      totalAborted: 0,
      totalRefunded: 0,
      peakQueueSize: 0,
      redisErrors: 0,
      fallbackAcquisitions: 0,
    };
  }

  get isDistributed() {
    return Boolean(this.redisClient && this.redisClient.isOpen !== false);
  }

  get queuedRequests() {
    return this.queue.length;
  }

  get currentRpmUsage() {
    const now = this.clock.now();
    this._cleanOldTimestamps(now);
    return this.timestamps.length;
  }

  getMetrics() {
    const now = this.clock.now();
    this._cleanOldTimestamps(now);
    return {
      name: this.name,
      requestsPerMinute: this.requestsPerMinute,
      windowMs: this.windowMs,
      maxWaitMs: this.maxWaitMs,
      maxQueueSize: this.maxQueueSize,
      isDistributed: this.isDistributed,
      failPolicy: this.failPolicy,
      currentLocalUsage: this.timestamps.length,
      queuedRequests: this.queue.length,
      pausedUntil: this.pausedUntil,
      isPaused: now < this.pausedUntil,
      ...this.metrics,
    };
  }

  async _evalLua(script, keys, args) {
    if (!this.redisClient) {
      throw new Error("Redis client is not configured");
    }

    // Node-redis v4/v5 eval API: client.eval(script, { keys: [...], arguments: [...] })
    if (typeof this.redisClient.eval === "function") {
      try {
        return await this.redisClient.eval(script, {
          keys,
          arguments: args.map(String),
        });
      } catch (err) {
        // Fallback for custom or mock Redis clients supporting sendCommand
        if (typeof this.redisClient.sendCommand === "function") {
          return await this.redisClient.sendCommand([
            "EVAL",
            script,
            String(keys.length),
            ...keys,
            ...args.map(String),
          ]);
        }
        throw err;
      }
    }

    if (typeof this.redisClient.sendCommand === "function") {
      return await this.redisClient.sendCommand([
        "EVAL",
        script,
        String(keys.length),
        ...keys,
        ...args.map(String),
      ]);
    }

    throw new Error("Invalid Redis client interface");
  }

  _cleanOldTimestamps(now) {
    const cutoff = now - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] <= cutoff) {
      this.timestamps.shift();
    }
  }

  /**
   * Pause token issuance until the specified duration in ms has elapsed.
   * Respects full upstream cooldown (never resumes earlier) and syncs to Redis if distributed.
   */
  async pauseFor(ms) {
    if (typeof ms === "number" && ms > 0) {
      const now = this.clock.now();
      const resumeAt = now + ms;

      if (resumeAt > this.pausedUntil) {
        this.pausedUntil = resumeAt;
        console.warn(
          `[RATE_LIMITER:${this.name}] Pausing rate limiter for ${ms}ms until ${new Date(resumeAt).toISOString()}`,
        );
        this._scheduleDrain(ms + 10);
      }

      // Sync to shared Redis cluster if distributed
      if (this.isDistributed) {
        try {
          await this._evalLua(LUA_PAUSE_SCRIPT, [this.redisKey], [resumeAt, now]);
        } catch (err) {
          console.warn(`[RATE_LIMITER:${this.name}] Failed to sync pause to Redis:`, err.message);
        }
      }
    }
  }

  /**
   * Acquire a rate limit permit.
   *
   * @param {Object} options
   * @param {AbortSignal} [options.signal] Client abort signal
   * @param {string} [options.model] Model identifier for telemetry
   * @param {string} [options.provider] Provider name for telemetry
   * @returns {Promise<Function>} A refund function that restores the permit ONLY if called before dispatch.
   */
  async acquire(options = {}) {
    const { signal, model = "unknown", provider = this.name } = options;

    if (signal?.aborted) {
      const err = new Error("Request aborted by client.");
      err.name = "AbortError";
      throw err;
    }

    const now = this.clock.now();

    // Fail-fast rejection if upstream cooldown exceeds practical wait timeout
    if (now < this.pausedUntil && (this.pausedUntil - now) > this.maxWaitMs) {
      this.metrics.totalRejected++;
      console.warn(
        `[RATE_LIMITER:${this.name}] Upstream cooldown (${this.pausedUntil - now}ms) exceeds maxWaitMs (${this.maxWaitMs}ms). Rejecting request for ${model}`,
      );
      throw new ProviderError(
        "The AI service is cooling down following upstream rate limits. Please try again shortly.",
        {
          provider,
          model,
          statusCode: 503,
          errorCode: "UPSTREAM_COOLDOWN_ACTIVE",
          isTransient: true,
          waitTimeMs: this.pausedUntil - now,
        },
      );
    }

    // Check bounded queue capacity first
    if (this.queue.length >= this.maxQueueSize) {
      this.metrics.totalRejected++;
      console.warn(
        `[RATE_LIMITER:${this.name}] Rate limit queue full (${this.queue.length}/${this.maxQueueSize}). Rejecting request for ${model}`,
      );
      throw new ProviderError(
        "The AI service is currently at maximum capacity. Please try again in a few moments.",
        {
          provider,
          model,
          statusCode: 503,
          errorCode: "PROVIDER_CAPACITY_EXCEEDED",
          isTransient: true,
        },
      );
    }

    // If distributed Redis is enabled, execute atomic Lua sliding window
    if (this.isDistributed) {
      return this._acquireRedis(options, now);
    }

    // Local in-memory sliding window
    return this._acquireLocal(options, now);
  }

  async _acquireRedis(options, now) {
    const { signal, model = "unknown", provider = this.name } = options;
    const requestId = crypto.randomUUID();

    try {
      const result = await this._evalLua(
        LUA_ACQUIRE_SCRIPT,
        [this.redisKey],
        [now, this.windowMs, this.requestsPerMinute, requestId],
      );

      const [granted, waitMs, currentCount] = Array.isArray(result) ? result : [0, 60000, 0];

      if (granted === 1) {
        this.metrics.totalAcquired++;
        let refunded = false;

        return async () => {
          if (refunded) return;
          refunded = true;
          this.metrics.totalRefunded++;
          try {
            await this._evalLua(LUA_REFUND_SCRIPT, [this.redisKey], [requestId]);
          } catch (err) {
            console.warn(`[RATE_LIMITER:${this.name}] Failed to refund Redis token:`, err.message);
          }
        };
      }

      // Token not granted; check estimated wait
      if (waitMs > this.maxWaitMs) {
        this.metrics.totalRejected++;
        console.warn(
          `[RATE_LIMITER:${this.name}] Redis estimated wait (${waitMs}ms) exceeds maxWaitMs (${this.maxWaitMs}ms) for ${model}`,
        );
        throw new ProviderError(
          "The AI service rate limit capacity is temporarily saturated. Please try again shortly.",
          {
            provider,
            model,
            statusCode: 503,
            errorCode: "PROVIDER_RATE_LIMIT_WAIT_EXCEEDED",
            isTransient: true,
            waitTimeMs: waitMs,
          },
        );
      }

      // Enqueue to wait for slot
      return this._enqueueRequest(options, waitMs);
    } catch (err) {
      if (err instanceof ProviderError || err.name === "AbortError") {
        throw err;
      }

      this.metrics.redisErrors++;
      console.warn(
        `[RATE_LIMITER:${this.name}] Redis rate limiter failed: ${err.message}. Fail policy: ${this.failPolicy}`,
      );

      if (this.failPolicy === "fail_closed") {
        throw new ProviderError(
          "The AI rate limiter service is temporarily unavailable. Please try again shortly.",
          {
            provider,
            model,
            statusCode: 503,
            errorCode: "REDIS_RATE_LIMITER_UNAVAILABLE",
            isTransient: true,
            cause: err,
          },
        );
      }

      // Fail policy is local_fallback: fall back to local limiter so traffic is still strictly constrained
      this.metrics.fallbackAcquisitions++;
      return this._acquireLocal(options, now);
    }
  }

  async _acquireLocal(options, now) {
    const { signal, model = "unknown", provider = this.name } = options;

    this._cleanOldTimestamps(now);
    const isPaused = now < this.pausedUntil;

    // Fast path: token available immediately and no prior queue waiting
    if (
      !isPaused &&
      this.timestamps.length < this.requestsPerMinute &&
      this.queue.length === 0
    ) {
      return this._grantToken(now);
    }

    // Calculate expected wait time
    const waitTimeMs = this._calculateEstimatedWaitMs(now);
    if (waitTimeMs > this.maxWaitMs) {
      this.metrics.totalRejected++;
      console.warn(
        `[RATE_LIMITER:${this.name}] Estimated wait (${waitTimeMs}ms) exceeds maxWaitMs (${this.maxWaitMs}ms) for ${model}`,
      );
      throw new ProviderError(
        "The AI service rate limit capacity is temporarily saturated. Please try again shortly.",
        {
          provider,
          model,
          statusCode: 503,
          errorCode: "PROVIDER_RATE_LIMIT_WAIT_EXCEEDED",
          isTransient: true,
          waitTimeMs,
        },
      );
    }

    return this._enqueueRequest(options, waitTimeMs);
  }

  _enqueueRequest(options, waitTimeMs) {
    const { signal, model = "unknown", provider = this.name } = options;

    return new Promise((resolve, reject) => {
      let timeoutId = null;
      let abortHandler = null;

      const queueItem = {
        queuedAt: this.clock.now(),
        resolve: (refundFn) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (abortHandler && signal)
            signal.removeEventListener("abort", abortHandler);
          resolve(refundFn);
        },
        reject: (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (abortHandler && signal)
            signal.removeEventListener("abort", abortHandler);
          reject(err);
        },
      };

      timeoutId = setTimeout(() => {
        const idx = this.queue.indexOf(queueItem);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          this.metrics.totalTimedOut++;
          queueItem.reject(
            new ProviderError(
              "The AI service rate limiter wait timeout expired. Please try again shortly.",
              {
                provider,
                model,
                statusCode: 504,
                errorCode: "RATE_LIMIT_QUEUE_TIMEOUT",
                isTransient: true,
              },
            ),
          );
        }
      }, this.maxWaitMs);
      timeoutId.unref?.();

      if (signal) {
        abortHandler = () => {
          const idx = this.queue.indexOf(queueItem);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
            this.metrics.totalAborted++;
            const abortErr = new Error(
              "Request aborted by client while waiting for rate limit capacity.",
            );
            abortErr.name = "AbortError";
            queueItem.reject(abortErr);
          }
        };
        signal.addEventListener("abort", abortHandler, { once: true });
      }

      this.queue.push(queueItem);
      if (this.queue.length > this.metrics.peakQueueSize) {
        this.metrics.peakQueueSize = this.queue.length;
      }

      this._scheduleDrain(Math.max(10, waitTimeMs));
    });
  }

  _calculateEstimatedWaitMs(now) {
    let baseTime = now;
    if (now < this.pausedUntil) {
      baseTime = this.pausedUntil;
    }

    const position = this.queue.length;
    const targetSlotIndex =
      this.timestamps.length - this.requestsPerMinute + position;

    if (targetSlotIndex >= 0 && targetSlotIndex < this.timestamps.length) {
      const expiringTimestamp = this.timestamps[targetSlotIndex];
      const waitFromWindow = expiringTimestamp + this.windowMs - now;
      return Math.max(baseTime - now, waitFromWindow);
    }

    return Math.max(0, baseTime - now);
  }

  _grantToken(now) {
    this.timestamps.push(now);
    this.metrics.totalAcquired++;

    let refunded = false;
    return () => {
      if (refunded) return;
      refunded = true;
      this.metrics.totalRefunded++;
      const idx = this.timestamps.indexOf(now);
      if (idx !== -1) {
        this.timestamps.splice(idx, 1);
        this._drainQueue();
      }
    };
  }

  _scheduleDrain(delayMs) {
    if (this.drainTimeoutId) return;
    this.drainTimeoutId = setTimeout(() => {
      this.drainTimeoutId = null;
      this._drainQueue();
    }, Math.max(1, delayMs));
    this.drainTimeoutId.unref?.();
  }

  async _drainQueue() {
    const now = this.clock.now();

    if (this.isDistributed) {
      // For distributed mode, attempt to acquire next token for queued item
      while (this.queue.length > 0) {
        const item = this.queue[0];
        try {
          const requestId = crypto.randomUUID();
          const result = await this._evalLua(
            LUA_ACQUIRE_SCRIPT,
            [this.redisKey],
            [now, this.windowMs, this.requestsPerMinute, requestId],
          );
          const [granted, waitMs] = Array.isArray(result) ? result : [0, 60000];
          if (granted === 1) {
            this.queue.shift();
            this.metrics.totalAcquired++;
            let refunded = false;
            item.resolve(async () => {
              if (refunded) return;
              refunded = true;
              this.metrics.totalRefunded++;
              try {
                await this._evalLua(LUA_REFUND_SCRIPT, [this.redisKey], [requestId]);
              } catch (err) {
                console.warn(`[RATE_LIMITER:${this.name}] Failed to refund token:`, err.message);
              }
            });
          } else {
            this._scheduleDrain(Math.max(10, waitMs));
            break;
          }
        } catch {
          break;
        }
      }
      return;
    }

    // Local mode drain
    this._cleanOldTimestamps(now);

    if (now < this.pausedUntil) {
      this._scheduleDrain(this.pausedUntil - now + 10);
      return;
    }

    while (
      this.queue.length > 0 &&
      this.timestamps.length < this.requestsPerMinute
    ) {
      const item = this.queue.shift();
      if (!item) break;
      const refundFn = this._grantToken(now);
      item.resolve(refundFn);
    }

    if (this.queue.length > 0) {
      const nextWait = this._calculateEstimatedWaitMs(now);
      this._scheduleDrain(Math.max(10, nextWait));
    }
  }

  drainQueue() {
    if (this.drainTimeoutId) {
      clearTimeout(this.drainTimeoutId);
      this.drainTimeoutId = null;
    }
    this._drainQueue();
  }

  reset() {
    if (this.drainTimeoutId) {
      clearTimeout(this.drainTimeoutId);
      this.drainTimeoutId = null;
    }
    for (const item of this.queue) {
      item.reject(new Error("Rate limiter reset"));
    }
    this.queue = [];
    this.timestamps = [];
    this.pausedUntil = 0;
    this.metrics = {
      totalAcquired: 0,
      totalRejected: 0,
      totalTimedOut: 0,
      totalAborted: 0,
      totalRefunded: 0,
      peakQueueSize: 0,
      redisErrors: 0,
      fallbackAcquisitions: 0,
    };
  }
}
