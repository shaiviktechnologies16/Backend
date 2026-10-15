import { performance } from "node:perf_hooks";
import { ProviderConcurrencyLimiter } from "../src/providers/concurrency/provider-concurrency-limiter.js";
import { ProviderError } from "../src/common/errors/ProviderError.js";

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.min(
    Math.floor((p / 100) * sorted.length),
    sorted.length - 1,
  );
  return Number(sorted[index].toFixed(2));
}

/**
 * Simulates a batch of concurrent users making requests to an AI model provider.
 * Supports testing both Unbounded (Current Legacy) and Bounded Queue (Proposed) architectures.
 */
async function runConcurrencyScenario({
  name,
  concurrency,
  architecture = "bounded", // "unbounded" (legacy) or "bounded" (protected)
  openRouterRpmLimit = 20, // OpenRouter free tier RPM limit
  generationDurationMs = 250, // Simulated token generation duration
  staggerMs = 0, // Delay between consecutive user starts (0 = all in same millisecond)
  maxLimiterConcurrency = 5,
  maxQueueSize = 50,
}) {
  console.log(`\n======================================================`);
  console.log(`SCENARIO: ${name}`);
  console.log(`Users: ${concurrency} | Architecture: ${architecture.toUpperCase()}`);
  console.log(`OpenRouter Model: nvidia/nemotron-3-super-120b-a12b:free (Limit: ${openRouterRpmLimit} RPM)`);
  console.log(`======================================================`);

  const limiter =
    architecture === "bounded"
      ? new ProviderConcurrencyLimiter({
          name: "benchmark",
          maxConcurrency: maxLimiterConcurrency,
          maxQueueSize: maxQueueSize,
          queueTimeoutMs: 15000,
        })
      : null;

  // Track upstream OpenRouter request rate (20 requests per 60 seconds rolling window)
  const rollingWindowMs = 60000;
  const upstreamRequestTimestamps = [];

  const latencies = [];
  const ttfbList = [];
  const queueWaitList = [];
  let successCount = 0;
  let rateLimit429Count = 0;
  let capacity503Count = 0;
  let timeout504Count = 0;

  const testStartTime = performance.now();
  const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

  const userPromises = Array.from({ length: concurrency }, async (_, userIndex) => {
    if (staggerMs > 0) {
      await new Promise((r) => setTimeout(r, userIndex * staggerMs));
    }

    const requestStart = performance.now();
    let releaseSlot = null;

    try {
      // Step 1: Concurrency limiting (if bounded)
      if (limiter) {
        const queueStart = performance.now();
        releaseSlot = await limiter.acquire({
          model: "nvidia/nemotron-3-super-120b-a12b:free",
          provider: "openai",
        });
        queueWaitList.push(performance.now() - queueStart);
      } else {
        queueWaitList.push(0);
      }

      // Step 2: Upstream OpenRouter Rate Limit Check (20 RPM limit)
      const now = performance.now();
      while (
        upstreamRequestTimestamps.length > 0 &&
        now - upstreamRequestTimestamps[0] > rollingWindowMs
      ) {
        upstreamRequestTimestamps.shift();
      }

      if (upstreamRequestTimestamps.length >= openRouterRpmLimit) {
        // Upstream OpenRouter responds with HTTP 429 Too Many Requests
        rateLimit429Count++;
        throw new ProviderError("OpenRouter 429: Rate limit exceeded (20 RPM cap for free models).", {
          statusCode: 429,
          provider: "openai",
          model: "nvidia/nemotron-3-super-120b-a12b:free",
        });
      }

      upstreamRequestTimestamps.push(now);

      // Step 3: Stream generation simulation
      const ttfb = performance.now() - requestStart;
      ttfbList.push(ttfb);

      await new Promise((r) => setTimeout(r, generationDurationMs));

      successCount++;
      latencies.push(performance.now() - requestStart);
    } catch (err) {
      if (err.statusCode === 503 || err.errorCode === "PROVIDER_CAPACITY_EXCEEDED") {
        capacity503Count++;
      } else if (err.statusCode === 504 || err.errorCode === "QUEUE_TIMEOUT") {
        timeout504Count++;
      }
    } finally {
      if (releaseSlot) {
        releaseSlot();
      }
    }
  });

  await Promise.all(userPromises);

  const totalDuration = performance.now() - testStartTime;
  const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;

  const result = {
    scenario: name,
    totalUsers: concurrency,
    architecture,
    durationMs: Number(totalDuration.toFixed(2)),
    successCount,
    successRate: `${((successCount / concurrency) * 100).toFixed(1)}%`,
    rateLimit429Count,
    capacity503Count,
    timeout504Count,
    ttfbP50: percentile(ttfbList, 50),
    ttfbP95: percentile(ttfbList, 95),
    ttfbP99: percentile(ttfbList, 99),
    latencyP50: percentile(latencies, 50),
    latencyP95: percentile(latencies, 95),
    latencyP99: percentile(latencies, 99),
    queueWaitP50: percentile(queueWaitList, 50),
    queueWaitP95: percentile(queueWaitList, 95),
    peakConcurrency: limiter ? limiter.metrics.peakConcurrency : concurrency,
    peakQueueDepth: limiter ? limiter.metrics.peakQueueSize : 0,
    heapDeltaMb: Number((finalMemory - initialMemory).toFixed(2)),
  };

  console.table([result]);
  return result;
}

async function main() {
  console.log("================================================================================");
  console.log("PRODUCTION CAPACITY AUDIT: 100 CONCURRENT USERS LOAD TEST & ARCHITECTURAL BENCHMARK");
  console.log("Target Model: nvidia/nemotron-3-super-120b-a12b:free via OpenRouter");
  console.log("================================================================================\n");

  const results = [];

  // Phase A: Baseline Tests on Unbounded (Current Implementation)
  // Shows how without concurrency control, requests 21-100 immediately crash with 429
  results.push(
    await runConcurrencyScenario({
      name: "1. Baseline: 10 Concurrent Users (Legacy Unbounded)",
      concurrency: 10,
      architecture: "unbounded",
      generationDurationMs: 150,
    }),
  );

  results.push(
    await runConcurrencyScenario({
      name: "2. 25 Concurrent Users (Legacy Unbounded)",
      concurrency: 25,
      architecture: "unbounded",
      generationDurationMs: 150,
    }),
  );

  results.push(
    await runConcurrencyScenario({
      name: "3. 50 Concurrent Users (Legacy Unbounded)",
      concurrency: 50,
      architecture: "unbounded",
      generationDurationMs: 150,
    }),
  );

  results.push(
    await runConcurrencyScenario({
      name: "4. 100 Concurrent Users Instant Burst (Legacy Unbounded)",
      concurrency: 100,
      architecture: "unbounded",
      generationDurationMs: 150,
    }),
  );

  // Phase B: Protected Architecture with ProviderConcurrencyLimiter
  // Shows controlled concurrency, bounded queuing, and clean backpressure without upstream failure
  results.push(
    await runConcurrencyScenario({
      name: "5. 100 Users Staggered Over 10s (Protected Bounded Queue)",
      concurrency: 100,
      architecture: "bounded",
      staggerMs: 100, // 100 users over 10 seconds (10 users/sec)
      maxLimiterConcurrency: 5,
      maxQueueSize: 50,
      generationDurationMs: 150,
    }),
  );

  results.push(
    await runConcurrencyScenario({
      name: "6. 100 Users Instant Burst in 1s (Protected Bounded Queue)",
      concurrency: 100,
      architecture: "bounded",
      staggerMs: 0, // all 100 in same instant
      maxLimiterConcurrency: 5,
      maxQueueSize: 50,
      generationDurationMs: 150,
    }),
  );

  console.log("\n================================================================================");
  console.log("SUMMARY OF ALL LOAD AUDIT SCENARIOS");
  console.log("================================================================================");
  console.table(
    results.map((r) => ({
      Scenario: r.scenario,
      Users: r.totalUsers,
      Arch: r.architecture,
      Success: r.successRate,
      "429 RateLimit": r.rateLimit429Count,
      "503 Capacity": r.capacity503Count,
      "TTFB p95 (ms)": r.ttfbP95,
      "Duration (ms)": r.durationMs,
    })),
  );
}

main().catch(console.error);

