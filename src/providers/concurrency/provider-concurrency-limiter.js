import { ProviderError } from "../../common/errors/ProviderError.js";

/**
 * ProviderConcurrencyLimiter
 * 
 * Implements a bounded asynchronous semaphore queue to manage concurrent
 * requests to external AI model providers (e.g., OpenRouter, OpenAI, Ollama).
 * 
 * Features:
 * - Configurable maximum concurrency per provider/model.
 * - Bounded FIFO wait queue with overflow rejection (HTTP 503 / ProviderError).
 * - Per-request queue wait timeout to prevent requests hanging indefinitely.
 * - Native AbortSignal support to instantly cancel queued requests if the client disconnects.
 * - Upstream pause support (e.g. respecting HTTP 429 Retry-After delays).
 * - Real-time telemetry and metrics for monitoring and load testing.
 */
export class ProviderConcurrencyLimiter {
  constructor({
    name = "default",
    maxConcurrency = 5,
    maxQueueSize = 50,
    queueTimeoutMs = 30000,
  } = {}) {
    this.name = name;
    this.maxConcurrency = Math.max(1, Number(maxConcurrency) || 5);
    this.maxQueueSize = Math.max(0, Number(maxQueueSize) || 50);
    this.queueTimeoutMs = Math.max(1000, Number(queueTimeoutMs) || 30000);

    this.activeCount = 0;
    this.queue = [];
    this.pausedUntil = 0;

    this.metrics = {
      peakConcurrency: 0,
      peakQueueSize: 0,
      totalAcquired: 0,
      totalRejected: 0,
      totalTimedOut: 0,
      totalAborted: 0,
    };
  }

  get activeRequests() {
    return this.activeCount;
  }

  get queuedRequests() {
    return this.queue.length;
  }

  getMetrics() {
    return {
      name: this.name,
      maxConcurrency: this.maxConcurrency,
      maxQueueSize: this.maxQueueSize,
      queueTimeoutMs: this.queueTimeoutMs,
      activeRequests: this.activeCount,
      queuedRequests: this.queue.length,
      ...this.metrics,
    };
  }

  /**
   * Pause accepting new executions until the given timestamp (e.g., from Retry-After).
   * @param {number} ms Duration in milliseconds to pause granting slots.
   */
  pauseFor(ms) {
    if (typeof ms === "number" && ms > 0) {
      // Respect full upstream cooldown: never resume earlier than upstream requires
      const resumeAt = Date.now() + ms;
      if (resumeAt > this.pausedUntil) {
        this.pausedUntil = resumeAt;
        console.warn(`[CONCURRENCY_LIMITER:${this.name}] Pausing requests for ${ms}ms until ${new Date(resumeAt).toISOString()}`);
        const timer = setTimeout(() => this._drainQueue(), ms + 10);
        timer.unref?.();
      }
    }
  }

  /**
   * Acquire a concurrency slot or queue until one is available.
   * @param {Object} options
   * @param {AbortSignal} [options.signal] Client abort signal
   * @param {string} [options.model] Model identifier for error reporting
   * @param {string} [options.provider] Provider name for error reporting
   * @returns {Promise<Function>} A release function to be called when the request completes.
   */
  async acquire(options = {}) {
    const { signal, model = "unknown", provider = this.name } = options;

    if (signal?.aborted) {
      const err = new Error("Request aborted by client.");
      err.name = "AbortError";
      throw err;
    }

    const now = Date.now();
    const isPaused = now < this.pausedUntil;

    // Fail-fast rejection if upstream cooldown exceeds practical wait timeout
    if (isPaused && (this.pausedUntil - now) > this.queueTimeoutMs) {
      this.metrics.totalRejected++;
      console.warn(`[CONCURRENCY_LIMITER:${this.name}] Upstream cooldown (${this.pausedUntil - now}ms) exceeds queueTimeoutMs (${this.queueTimeoutMs}ms). Rejecting request for ${model}`);
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

    // Fast path: immediate acquisition if under concurrency limit and not paused
    if (!isPaused && this.activeCount < this.maxConcurrency && this.queue.length === 0) {
      return this._grantSlot();
    }

    // Check if the bounded queue is already full
    if (this.queue.length >= this.maxQueueSize) {
      this.metrics.totalRejected++;
      console.warn(`[CONCURRENCY_LIMITER:${this.name}] Queue full (${this.queue.length}/${this.maxQueueSize}). Rejecting request for ${model}`);
      throw new ProviderError(
        "The AI service is currently experiencing high demand. Please try again shortly.",
        {
          provider,
          model,
          statusCode: 503,
          errorCode: "PROVIDER_CAPACITY_EXCEEDED",
          isTransient: true,
        },
      );
    }

    // Enqueue the request
    return new Promise((resolve, reject) => {
      let timeoutId = null;
      let abortHandler = null;

      const queueItem = {
        queuedAt: Date.now(),
        resolve: (releaseFn) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (abortHandler && signal) signal.removeEventListener("abort", abortHandler);
          resolve(releaseFn);
        },
        reject: (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (abortHandler && signal) signal.removeEventListener("abort", abortHandler);
          reject(err);
        },
      };

      // Set timeout for maximum wait time in queue
      timeoutId = setTimeout(() => {
        const idx = this.queue.indexOf(queueItem);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          this.metrics.totalTimedOut++;
          console.warn(`[CONCURRENCY_LIMITER:${this.name}] Request timed out waiting in queue after ${this.queueTimeoutMs}ms for ${model}`);
          queueItem.reject(
            new ProviderError(
              "The AI service took too long to assign capacity. Please try again shortly.",
              {
                provider,
                model,
                statusCode: 504,
                errorCode: "QUEUE_TIMEOUT",
                isTransient: true,
              },
            ),
          );
        }
      }, this.queueTimeoutMs);
      timeoutId.unref?.();

      // Handle client disconnect / abort while queued
      if (signal) {
        abortHandler = () => {
          const idx = this.queue.indexOf(queueItem);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
            this.metrics.totalAborted++;
            console.log(`[CONCURRENCY_LIMITER:${this.name}] Queued request cancelled by client abort signal.`);
            const abortErr = new Error("Request aborted by client while queued.");
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

      // Check if paused and schedule check
      if (isPaused) {
        setTimeout(() => this._drainQueue(), this.pausedUntil - now + 10);
      }
    });
  }

  _grantSlot() {
    this.activeCount++;
    this.metrics.totalAcquired++;
    if (this.activeCount > this.metrics.peakConcurrency) {
      this.metrics.peakConcurrency = this.activeCount;
    }

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeCount = Math.max(0, this.activeCount - 1);
      this._drainQueue();
    };
  }

  _drainQueue() {
    if (Date.now() < this.pausedUntil) {
      return;
    }

    while (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const nextItem = this.queue.shift();
      if (!nextItem) break;
      const releaseFn = this._grantSlot();
      nextItem.resolve(releaseFn);
    }
  }

  reset() {
    for (const item of this.queue) {
      item.reject(new Error("Concurrency limiter reset"));
    }
    this.queue = [];
    this.activeCount = 0;
    this.pausedUntil = 0;
    this.metrics = {
      peakConcurrency: 0,
      peakQueueSize: 0,
      totalAcquired: 0,
      totalRejected: 0,
      totalTimedOut: 0,
      totalAborted: 0,
    };
  }
}

