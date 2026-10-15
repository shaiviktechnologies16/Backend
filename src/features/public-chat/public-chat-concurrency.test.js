import test from "node:test";
import assert from "node:assert/strict";
import { ProviderConcurrencyLimiter } from "../../providers/concurrency/provider-concurrency-limiter.js";
import { ProviderRateLimiter } from "../../providers/concurrency/provider-rate-limiter.js";
import { OpenAIProvider } from "../../providers/openai/openai.provider.js";
import { ProviderError } from "../../common/errors/ProviderError.js";

test("ProviderConcurrencyLimiter: limits active concurrency and queues remaining requests", async () => {
  const limiter = new ProviderConcurrencyLimiter({
    name: "test-limiter",
    maxConcurrency: 3,
    maxQueueSize: 10,
    queueTimeoutMs: 5000,
  });

  let activePeak = 0;
  let currentlyRunning = 0;
  const executionOrder = [];

  const runTask = async (id, durationMs) => {
    const release = await limiter.acquire({ model: "test-model" });
    currentlyRunning++;
    activePeak = Math.max(activePeak, currentlyRunning);
    executionOrder.push(`start-${id}`);

    await new Promise((r) => setTimeout(r, durationMs));

    executionOrder.push(`end-${id}`);
    currentlyRunning--;
    release();
  };

  // Launch 6 tasks concurrently with maxConcurrency = 3
  const tasks = [
    runTask(1, 40),
    runTask(2, 40),
    runTask(3, 40),
    runTask(4, 20),
    runTask(5, 20),
    runTask(6, 20),
  ];

  await Promise.all(tasks);

  assert.equal(activePeak, 3, "Peak concurrency should not exceed maxConcurrency (3)");
  assert.equal(executionOrder.slice(0, 3).length, 3, "First 3 tasks should start immediately");
  assert.equal(limiter.metrics.totalAcquired, 6, "All 6 tasks should have acquired a slot");
  assert.equal(limiter.metrics.totalRejected, 0, "No tasks should be rejected");
});

test("ProviderConcurrencyLimiter: rejects immediately with 503 when queue overflows", async () => {
  const limiter = new ProviderConcurrencyLimiter({
    name: "overflow-test",
    maxConcurrency: 2,
    maxQueueSize: 2, // Only 2 can queue
    queueTimeoutMs: 5000,
  });

  const releases = [];
  // Occupy 2 active slots
  releases.push(await limiter.acquire({ model: "test" }));
  releases.push(await limiter.acquire({ model: "test" }));

  // Fill the queue with 2 requests
  const p1 = limiter.acquire({ model: "test" });
  const p2 = limiter.acquire({ model: "test" });

  assert.equal(limiter.activeRequests, 2);
  assert.equal(limiter.queuedRequests, 2);

  // 5th request should be immediately rejected with 503 PROVIDER_CAPACITY_EXCEEDED
  await assert.rejects(
    async () => {
      await limiter.acquire({ model: "nvidia/nemotron-3-super-120b-a12b:free" });
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.statusCode, 503);
      assert.equal(err.errorCode, "PROVIDER_CAPACITY_EXCEEDED");
      assert.equal(err.isTransient, true);
      return true;
    },
  );

  assert.equal(limiter.metrics.totalRejected, 1);

  // Release one active slot, allowing one queued item to resolve
  releases[0]();
  const nextRelease = await p1;
  nextRelease();

  // Release second active slot, allowing second queued item to resolve
  releases[1]();
  const nextRelease2 = await p2;
  nextRelease2();

  assert.equal(limiter.activeRequests, 0);
  assert.equal(limiter.queuedRequests, 0);
});

test("ProviderConcurrencyLimiter: cancels queued request instantly when AbortSignal fires", async () => {
  const limiter = new ProviderConcurrencyLimiter({
    name: "abort-test",
    maxConcurrency: 1,
    maxQueueSize: 5,
    queueTimeoutMs: 10000,
  });

  // Occupy active slot
  const release = await limiter.acquire({ model: "test" });

  const controller = new AbortController();
  const queuedPromise = limiter.acquire({ signal: controller.signal, model: "test" });

  assert.equal(limiter.queuedRequests, 1);

  // Abort while waiting in queue
  controller.abort();

  await assert.rejects(
    async () => {
      await queuedPromise;
    },
    (err) => {
      assert.equal(err.name, "AbortError");
      return true;
    },
  );

  assert.equal(limiter.queuedRequests, 0, "Queued request must be removed immediately upon abort");
  assert.equal(limiter.metrics.totalAborted, 1);

  release();
});

test("ProviderConcurrencyLimiter: times out requests exceeding queueTimeoutMs", async () => {
  const limiter = new ProviderConcurrencyLimiter({
    name: "timeout-test",
    maxConcurrency: 1,
    maxQueueSize: 5,
    queueTimeoutMs: 50, // 50ms queue timeout
  });

  const release = await limiter.acquire({ model: "test" });

  await assert.rejects(
    async () => {
      await limiter.acquire({ model: "test" });
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.statusCode, 504);
      assert.equal(err.errorCode, "QUEUE_TIMEOUT");
      return true;
    },
  );

  assert.equal(limiter.metrics.totalTimedOut, 1);
  release();
});

test("ProviderConcurrencyLimiter: pauseFor delays slot grants during upstream Retry-After", async () => {
  const limiter = new ProviderConcurrencyLimiter({
    name: "pause-test",
    maxConcurrency: 2,
    maxQueueSize: 5,
    queueTimeoutMs: 5000,
  });

  const startTime = Date.now();
  limiter.pauseFor(100);

  const release = await limiter.acquire({ model: "test" });
  const elapsed = Date.now() - startTime;

  assert.ok(elapsed >= 70, `Expected delay >= 70ms, saw ${elapsed}ms`);
  release();
});

test("OpenAIProvider: passes AbortSignal to client.chat.completions.create", async () => {
  let passedSignal = null;
  const mockClient = {
    chat: {
      completions: {
        create: async (body, options) => {
          passedSignal = options?.signal;
          return (async function* () {
            yield { choices: [{ delta: { content: "test" } }] };
          })();
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    getPlatformApiKeyValueUseCase: { execute: async () => "test-key" },
  });
  provider.getClient = async () => mockClient;

  const controller = new AbortController();
  for await (const _ of provider.stream([{ role: "user", content: "Hi" }], { signal: controller.signal })) {}

  assert.equal(passedSignal, controller.signal, "AbortSignal should be passed directly to OpenAI client create()");
});

test("OpenAIProvider: handles Retry-After header and pauses limiter", async () => {
  let callCount = 0;
  const mockClient = {
    chat: {
      completions: {
        create: async () => {
          callCount++;
          if (callCount === 1) {
            const err = new Error("Rate limit exceeded");
            err.status = 429;
            err.headers = { "retry-after": "1" };
            throw err;
          }
          return (async function* () {
            yield { choices: [{ delta: { content: "Recovered" } }] };
          })();
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    getPlatformApiKeyValueUseCase: { execute: async () => "test-key" },
  });
  provider.getClient = async () => mockClient;

  const chunks = [];
  for await (const chunk of provider.stream([{ role: "user", content: "Hi" }])) {
    if (chunk.type === "token") chunks.push(chunk.content);
  }

  assert.equal(callCount, 2, "Should retry after 429");
  assert.equal(chunks.join(""), "Recovered");
  assert.ok(provider.limiter.pausedUntil > Date.now() - 2000, "Limiter pausedUntil should have been updated by Retry-After");
});

test("Load Simulation: 100 concurrent requests against ProviderConcurrencyLimiter", async () => {
  // Simulate 100 concurrent users accessing OpenRouter free tier with maxConcurrency = 5, maxQueue = 50
  const limiter = new ProviderConcurrencyLimiter({
    name: "load-simulation-100",
    maxConcurrency: 5,
    maxQueueSize: 50,
    queueTimeoutMs: 5000,
  });

  const results = {
    successful: 0,
    overloaded_503: 0,
    timedOut_504: 0,
    aborted: 0,
  };

  const simulatedDurations = [20, 30, 40, 25, 35]; // simulated 20-40ms generation time per request
  let completed = 0;

  const promises = Array.from({ length: 100 }, async (_, index) => {
    try {
      const release = await limiter.acquire({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        provider: "openai",
      });

      const simDuration = simulatedDurations[index % simulatedDurations.length];
      await new Promise((r) => setTimeout(r, simDuration));
      release();
      results.successful++;
    } catch (err) {
      if (err instanceof ProviderError && err.statusCode === 503) {
        results.overloaded_503++;
      } else if (err instanceof ProviderError && err.statusCode === 504) {
        results.timedOut_504++;
      } else if (err.name === "AbortError") {
        results.aborted++;
      } else {
        throw err;
      }
    } finally {
      completed++;
    }
  });

  await Promise.all(promises);

  assert.equal(completed, 100, "All 100 requests must complete or fail cleanly");
  assert.equal(limiter.metrics.peakConcurrency, 5, "Peak concurrency must be strictly bounded to 5");
  assert.equal(limiter.activeRequests, 0, "All active slots must be freed");
  assert.equal(limiter.queuedRequests, 0, "Queue must be empty at the end");

  // With 100 instant burst requests, 5 active + 50 queued = 55 admitted, 45 rejected with 503
  assert.equal(results.overloaded_503, 45, "45 excess requests should be safely rejected with 503 without thrashing upstream");
  assert.equal(results.successful, 55, "55 requests should be safely serviced within queue capacity");

  console.log("[LOAD TEST 100 CONCURRENT USERS RESULT]", {
    totalRequests: 100,
    successful: results.successful,
    overloaded_503: results.overloaded_503,
    peakConcurrency: limiter.metrics.peakConcurrency,
    peakQueueDepth: limiter.metrics.peakQueueSize,
  });
});

// ============================================================================
// DETERMINISTIC CONTROLLABLE CLOCK TESTS FOR RATE LIMITING & COMPOSITION
// ============================================================================

class ControllableClock {
  constructor(initialTime = 100000) {
    this.time = initialTime;
  }
  now() {
    return this.time;
  }
  advance(ms) {
    this.time += ms;
  }
}

test("ProviderRateLimiter: strictly enforces configured RPM ceiling under controllable clock", async () => {
  const clock = new ControllableClock(50000);
  const rateLimiter = new ProviderRateLimiter({
    name: "rpm-ceiling-test",
    requestsPerMinute: 3,
    windowMs: 60000,
    maxWaitMs: 65000,
    maxQueueSize: 10,
    clock,
  });

  // Acquire up to RPM ceiling (3 requests)
  const r1 = await rateLimiter.acquire({ model: "test" });
  const r2 = await rateLimiter.acquire({ model: "test" });
  const r3 = await rateLimiter.acquire({ model: "test" });

  assert.ok(r1 && r2 && r3, "First 3 requests within RPM limit should succeed immediately");
  assert.equal(rateLimiter.currentRpmUsage, 3);
  assert.equal(rateLimiter.queuedRequests, 0);

  // 4th request at the same timestamp must be queued
  let fourthResolved = false;
  const p4 = rateLimiter.acquire({ model: "test" }).then((release) => {
    fourthResolved = true;
    return release;
  });

  assert.equal(fourthResolved, false, "4th request must be queued when RPM ceiling is reached");
  assert.equal(rateLimiter.queuedRequests, 1);

  // Advance clock by 60,001ms to roll past the sliding window
  clock.advance(60001);
  rateLimiter.drainQueue();

  const r4 = await p4;
  assert.ok(r4, "4th request should resolve after sliding window expires");
  assert.equal(fourthResolved, true);
  assert.equal(rateLimiter.queuedRequests, 0);
  assert.equal(rateLimiter.currentRpmUsage, 1, "Only 1 request active in new window");
});

test("ProviderRateLimiter: rejects immediately with 503 when queue overflows or wait exceeds maxWaitMs", async () => {
  const clock = new ControllableClock(1000);
  const rateLimiter = new ProviderRateLimiter({
    name: "overflow-test",
    requestsPerMinute: 1,
    windowMs: 60000,
    maxWaitMs: 10000, // max wait 10s
    maxQueueSize: 1,
    clock,
  });

  await rateLimiter.acquire({ model: "test" });

  // 2nd request has estimated wait of 60s > maxWaitMs (10s) -> should be rejected with 503
  await assert.rejects(
    async () => {
      await rateLimiter.acquire({ model: "test" });
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.statusCode, 503);
      assert.equal(err.errorCode, "PROVIDER_RATE_LIMIT_WAIT_EXCEEDED");
      return true;
    },
  );

  assert.equal(rateLimiter.metrics.totalRejected, 1);
});

test("ProviderRateLimiter: purges cancelled requests instantly when AbortSignal fires", async () => {
  const clock = new ControllableClock(1000);
  const rateLimiter = new ProviderRateLimiter({
    name: "abort-rate-test",
    requestsPerMinute: 1,
    windowMs: 60000,
    maxWaitMs: 65000,
    maxQueueSize: 5,
    clock,
  });

  // Occupy permit
  await rateLimiter.acquire({ model: "test" });

  const controller = new AbortController();
  const queuedPromise = rateLimiter.acquire({ signal: controller.signal, model: "test" });

  assert.equal(rateLimiter.queuedRequests, 1);

  // Client aborts
  controller.abort();

  await assert.rejects(
    async () => {
      await queuedPromise;
    },
    (err) => {
      assert.equal(err.name, "AbortError");
      return true;
    },
  );

  assert.equal(rateLimiter.queuedRequests, 0, "Aborted request must be removed immediately from queue");
  assert.equal(rateLimiter.metrics.totalAborted, 1);
});

test("ProviderRateLimiter: pauseFor respects Retry-After delay under controllable clock", async () => {
  const clock = new ControllableClock(10000);
  const rateLimiter = new ProviderRateLimiter({
    name: "pause-clock-test",
    requestsPerMinute: 5,
    windowMs: 60000,
    maxWaitMs: 30000,
    clock,
  });

  rateLimiter.pauseFor(5000); // Pause for 5 seconds

  let granted = false;
  const p = rateLimiter.acquire({ model: "test" }).then((refund) => {
    granted = true;
    return refund;
  });

  assert.equal(granted, false, "Must not grant slot while paused");

  // Advance clock by 5001ms
  clock.advance(5001);
  rateLimiter.drainQueue();

  const refund = await p;
  assert.ok(refund);
  assert.equal(granted, true);
});

test("OpenAIProvider + RateLimiter: acquires rate limit permit first and refunds if concurrency aborts", async () => {
  const clock = new ControllableClock(1000);
  const rateLimiter = new ProviderRateLimiter({
    name: "comp-rate",
    requestsPerMinute: 2,
    windowMs: 60000,
    clock,
  });
  const concurrencyLimiter = new ProviderConcurrencyLimiter({
    name: "comp-concurrency",
    maxConcurrency: 1,
    queueTimeoutMs: 2000,
  });

  // Occupy the 1 concurrency slot
  const releaseConcurrency = await concurrencyLimiter.acquire({ model: "test" });

  const provider = new OpenAIProvider({
    getPlatformApiKeyValueUseCase: { execute: async () => "mock-key" },
    limiter: concurrencyLimiter,
    rateLimiter,
  });
  provider.getClient = async () => ({
    chat: { completions: { create: async () => ({ choices: [{ message: { content: "ok" } }] }) } },
  });

  const controller = new AbortController();

  try {
    // Start chat with abort signal - will acquire rate token, then block on concurrency slot
    const chatPromise = provider.chat([{ role: "user", content: "hi" }], { signal: controller.signal });

    // Allow async getClient() and rateLimiter.acquire() to execute up to concurrencyLimiter.acquire()
    await new Promise((r) => setImmediate(r));

    assert.equal(rateLimiter.currentRpmUsage, 1, "Rate token was acquired");
    assert.equal(concurrencyLimiter.queuedRequests, 1, "Blocked in concurrency queue");

    // Client aborts while waiting for concurrency slot
    controller.abort();

    await assert.rejects(
      async () => {
        await chatPromise;
      },
      (err) => {
        assert.equal(err.name, "AbortError");
        return true;
      },
    );

    // Rate limiter token must have been refunded!
    assert.equal(rateLimiter.currentRpmUsage, 0, "Rate limit token should be refunded if aborted before execution");
    assert.equal(concurrencyLimiter.queuedRequests, 0);
  } finally {
    releaseConcurrency();
  }
});

test("OpenAIProvider: distinguishes daily quota exhaustion from transient rate limits and refuses retries", async () => {
  let callAttempts = 0;
  const mockClient = {
    chat: {
      completions: {
        create: async () => {
          callAttempts++;
          const quotaErr = new Error("You have exceeded your daily quota for model nvidia/nemotron-3-super-120b-a12b:free");
          quotaErr.status = 429;
          throw quotaErr;
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    getPlatformApiKeyValueUseCase: { execute: async () => "mock-key" },
  });
  provider.getClient = async () => mockClient;

  await assert.rejects(
    async () => {
      await provider.chat([{ role: "user", content: "hi" }]);
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.isTransient, false, "Daily quota exhaustion must NOT be marked transient");
      return true;
    },
  );

  assert.equal(callAttempts, 1, "Must NOT retry daily quota errors");
});

// ============================================================================
// REDIS DISTRIBUTED RATE LIMITER TESTS (Two Instances Sharing Redis)
// ============================================================================

class MockRedisClient {
  constructor() {
    this.zsets = new Map();
    this.strings = new Map();
    this.isOpen = true;
    this.shouldFail = false;
  }

  async eval(script, options) {
    if (this.shouldFail || !this.isOpen) {
      throw new Error("Connection to Redis lost (ECONNREFUSED)");
    }

    const { keys, arguments: args } = options;
    const key = keys[0];

    // LUA_ACQUIRE_SCRIPT
    if (script.includes("ZADD")) {
      const now = Number(args[0]);
      const windowMs = Number(args[1]);
      const maxRequests = Number(args[2]);
      const requestId = args[3];
      const pauseKey = `${key}:paused_until`;

      const pausedUntil = Number(this.strings.get(pauseKey) || 0);
      if (pausedUntil > now) {
        return [0, pausedUntil - now, 0];
      }

      let zset = this.zsets.get(key) || [];
      const clearBefore = now - windowMs;
      zset = zset.filter((item) => item.score > clearBefore);

      if (zset.length < maxRequests) {
        zset.push({ score: now, member: requestId });
        this.zsets.set(key, zset);
        return [1, 0, zset.length];
      } else {
        const oldest = zset.reduce((min, cur) => (cur.score < min.score ? cur : min), zset[0]);
        const waitMs = Math.max(0, (oldest.score + windowMs) - now);
        this.zsets.set(key, zset);
        return [0, waitMs, zset.length];
      }
    }

    // LUA_REFUND_SCRIPT
    if (script.includes("ZREM")) {
      const requestId = args[0];
      let zset = this.zsets.get(key) || [];
      const initLen = zset.length;
      zset = zset.filter((item) => item.member !== requestId);
      this.zsets.set(key, zset);
      return initLen - zset.length;
    }

    // LUA_PAUSE_SCRIPT
    if (script.includes("paused_until")) {
      const pauseKey = `${key}:paused_until`;
      const resumeAt = Number(args[0]);
      this.strings.set(pauseKey, resumeAt);
      return 1;
    }

    return 1;
  }
}

test("Redis Shared Limiter: two independent limiter instances share the aggregate RPM ceiling", async () => {
  const mockRedis = new MockRedisClient();
  const clock = new ControllableClock(1000);

  // Instance 1 (e.g. Backend Container 1)
  const limiterInstance1 = new ProviderRateLimiter({
    name: "shared-test",
    requestsPerMinute: 4, // 4 requests aggregate per minute
    windowMs: 60000,
    maxWaitMs: 30000,
    redisClient: mockRedis,
    clock,
  });

  // Instance 2 (e.g. Backend Container 2)
  const limiterInstance2 = new ProviderRateLimiter({
    name: "shared-test", // Same shared Redis key!
    requestsPerMinute: 4,
    windowMs: 60000,
    maxWaitMs: 30000,
    redisClient: mockRedis,
    clock,
  });

  // Instance 1 acquires 2 tokens
  const r1 = await limiterInstance1.acquire({ model: "test" });
  const r2 = await limiterInstance1.acquire({ model: "test" });
  assert.ok(r1 && r2);

  // Instance 2 acquires 2 tokens
  const r3 = await limiterInstance2.acquire({ model: "test" });
  const r4 = await limiterInstance2.acquire({ model: "test" });
  assert.ok(r3 && r4);

  // Total tokens across both instances in Redis = 4 (ceiling reached)
  // 5th request on Instance 1 must be rejected or queued
  await assert.rejects(
    async () => {
      await limiterInstance1.acquire({ model: "test" });
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.statusCode, 503);
      assert.equal(err.errorCode, "PROVIDER_RATE_LIMIT_WAIT_EXCEEDED");
      return true;
    },
  );

  // 5th request on Instance 2 must also be rejected
  await assert.rejects(
    async () => {
      await limiterInstance2.acquire({ model: "test" });
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.statusCode, 503);
      return true;
    },
  );
});

test("Redis Shared Limiter: refund occurs ONLY when cancelled before dispatch, NEVER after dispatch", async () => {
  const mockRedis = new MockRedisClient();
  const clock = new ControllableClock(1000);

  const sharedLimiter = new ProviderRateLimiter({
    name: "refund-audit",
    requestsPerMinute: 1, // Only 1 permit available
    windowMs: 60000,
    redisClient: mockRedis,
    clock,
  });

  // Concurrency limiter with 0 initial capacity to force queueing before dispatch
  const concurrencyLimiter = new ProviderConcurrencyLimiter({
    name: "block-dispatch",
    maxConcurrency: 1,
    queueTimeoutMs: 2000,
  });
  const blockPermit = await concurrencyLimiter.acquire({ model: "test" });

  let upstreamDispatched = false;
  const mockClient = {
    chat: {
      completions: {
        create: async () => {
          upstreamDispatched = true;
          return { choices: [{ message: { content: "ok" } }] };
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    getPlatformApiKeyValueUseCase: { execute: async () => "mock-key" },
    limiter: concurrencyLimiter,
    rateLimiter: sharedLimiter,
  });
  provider.getClient = async () => mockClient;

  // Case A: Cancelled BEFORE dispatch (while waiting for concurrency slot)
  const controllerA = new AbortController();
  const promiseA = provider.chat([{ role: "user", content: "reqA" }], { signal: controllerA.signal });

  await new Promise((r) => setImmediate(r));
  assert.equal(upstreamDispatched, false, "Must not have dispatched upstream yet");

  // Abort before dispatch
  controllerA.abort();

  await assert.rejects(async () => promiseA, (err) => err.name === "AbortError");

  // Token was refunded in Redis!
  assert.equal(sharedLimiter.metrics.totalRefunded, 1, "Token should be refunded when cancelled before dispatch");

  // Free the concurrency slot so next request can dispatch
  blockPermit();

  // Case B: Dispatched upstream - token must NEVER be refunded
  const resB = await provider.chat([{ role: "user", content: "reqB" }]);
  assert.ok(resB);
  assert.equal(upstreamDispatched, true, "Request B was dispatched upstream");

  // Refund count must STILL be 1 (request B's token was consumed and not refunded)
  assert.equal(sharedLimiter.metrics.totalRefunded, 1, "Dispatched request must NOT refund its token");
});

test("Redis Shared Limiter: fails safely on Redis outage according to configured failPolicy", async () => {
  const mockRedis = new MockRedisClient();
  const clock = new ControllableClock(1000);

  // Policy 1: fail_closed
  const failClosedLimiter = new ProviderRateLimiter({
    name: "outage-closed",
    requestsPerMinute: 5,
    redisClient: mockRedis,
    failPolicy: "fail_closed",
    clock,
  });

  mockRedis.shouldFail = true; // Simulate Redis outage

  await assert.rejects(
    async () => {
      await failClosedLimiter.acquire({ model: "test" });
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.statusCode, 503);
      assert.equal(err.errorCode, "REDIS_RATE_LIMITER_UNAVAILABLE");
      assert.equal(err.isTransient, true);
      return true;
    },
  );

  // Policy 2: local_fallback
  const fallbackLimiter = new ProviderRateLimiter({
    name: "outage-fallback",
    requestsPerMinute: 2,
    redisClient: mockRedis,
    failPolicy: "local_fallback",
    clock,
  });

  // Falls back to local limiter and succeeds within local bounds
  const token1 = await fallbackLimiter.acquire({ model: "test" });
  const token2 = await fallbackLimiter.acquire({ model: "test" });
  assert.ok(token1 && token2);

  assert.equal(fallbackLimiter.metrics.fallbackAcquisitions, 2);
  assert.equal(fallbackLimiter.metrics.redisErrors, 2);

  // Exceeding local fallback bounds still rejects, ensuring traffic is NEVER unrestricted!
  await assert.rejects(
    async () => {
      await fallbackLimiter.acquire({ model: "test" });
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.statusCode, 503);
      return true;
    },
  );
});

test("OpenAIProvider: rate-limits every retry attempt that creates an upstream request", async () => {
  const clock = new ControllableClock(1000);
  const rateLimiter = new ProviderRateLimiter({
    name: "retry-rate-test",
    requestsPerMinute: 5,
    windowMs: 60000,
    clock,
  });

  let networkCalls = 0;
  const mockClient = {
    chat: {
      completions: {
        create: async () => {
          networkCalls++;
          if (networkCalls === 1) {
            // First attempt fails with transient 502
            const err = new Error("Bad Gateway");
            err.status = 502;
            throw err;
          }
          return { choices: [{ message: { content: "recovered on retry" } }] };
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    getPlatformApiKeyValueUseCase: { execute: async () => "mock-key" },
    rateLimiter,
  });
  provider.getClient = async () => mockClient;

  const result = await provider.chat([{ role: "user", content: "test" }]);
  assert.equal(result.choices[0].message.content, "recovered on retry");
  assert.equal(networkCalls, 2, "Should have made 2 upstream requests (initial + 1 retry)");

  // Both attempt 0 and attempt 1 must have acquired a rate token
  assert.equal(rateLimiter.metrics.totalAcquired, 2, "Both the initial request and the retry must consume rate tokens");
});


