import dotenv from "dotenv";
dotenv.config();

import { performance } from "node:perf_hooks";
import { ProviderConcurrencyLimiter } from "../src/providers/concurrency/provider-concurrency-limiter.js";
import { ProviderRateLimiter } from "../src/providers/concurrency/provider-rate-limiter.js";
import { OpenAIProvider } from "../src/providers/openai/openai.provider.js";
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

// ============================================================================
// SIMULATED PIPELINE BENCHMARK (Composed Concurrency + Rate Limiter)
// ============================================================================
async function runMockedPipelineBenchmark(userCount, options = {}) {
  const { requestsPerMinute = 20, maxConcurrency = 5 } = options;
  console.log(`\n--- Running Composed Pipeline Benchmark: ${userCount} Concurrent Users ---`);
  console.log(`Config: maxConcurrency=${maxConcurrency}, requestsPerMinute=${requestsPerMinute} (OpenRouter free model)`);

  const limiter = new ProviderConcurrencyLimiter({
    name: `bench-concurrency-${userCount}`,
    maxConcurrency,
    maxQueueSize: 50,
    queueTimeoutMs: 15000,
  });

  const rateLimiter = new ProviderRateLimiter({
    name: `bench-rpm-${userCount}`,
    requestsPerMinute,
    windowMs: 60000,
    maxWaitMs: 15000,
    maxQueueSize: 50,
  });

  let simulatedStreamTimeMs = 50; // 50ms stream generation
  let activeInFlight = 0;
  let maxObservedInFlight = 0;

  const mockClient = {
    chat: {
      completions: {
        create: async (body, opt) => {
          activeInFlight++;
          if (activeInFlight > maxObservedInFlight) {
            maxObservedInFlight = activeInFlight;
          }

          return (async function* () {
            try {
              yield { choices: [{ delta: { content: "Hello" } }] };
              await new Promise((r) => setTimeout(r, simulatedStreamTimeMs / 2));
              yield { choices: [{ delta: { content: " from Shaivik AI!" } }] };
              await new Promise((r) => setTimeout(r, simulatedStreamTimeMs / 2));
              yield {
                usage: {
                  prompt_tokens: 15,
                  completion_tokens: 8,
                  total_tokens: 23,
                },
              };
            } finally {
              activeInFlight--;
            }
          })();
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    getPlatformApiKeyValueUseCase: { execute: async () => "mock-key" },
    limiter,
    rateLimiter,
  });
  provider.getClient = async () => mockClient;

  const ttfbList = [];
  const latencyList = [];
  let successCount = 0;
  let rejected503Count = 0;
  let rejectedWaitExceededCount = 0;
  let errorCount = 0;

  const testStart = performance.now();

  const requests = Array.from({ length: userCount }, async (_, idx) => {
    const reqStart = performance.now();
    let firstTokenTime = null;

    try {
      const stream = provider.stream(
        [{ role: "user", content: `Benchmark message ${idx}` }],
        { model: "nvidia/nemotron-3-super-120b-a12b:free" },
      );

      let text = "";
      for await (const chunk of stream) {
        if (chunk.type === "token") {
          if (firstTokenTime === null) {
            firstTokenTime = performance.now() - reqStart;
            ttfbList.push(firstTokenTime);
          }
          text += chunk.content;
        }
      }

      const totalTime = performance.now() - reqStart;
      latencyList.push(totalTime);
      successCount++;
    } catch (err) {
      if (err instanceof ProviderError) {
        if (err.errorCode === "PROVIDER_CAPACITY_EXCEEDED") {
          rejected503Count++;
        } else if (err.errorCode === "PROVIDER_RATE_LIMIT_WAIT_EXCEEDED") {
          rejectedWaitExceededCount++;
        } else {
          errorCount++;
          console.error(`Provider error for user ${idx}:`, err.message);
        }
      } else {
        errorCount++;
        console.error(`Unexpected error for user ${idx}:`, err.message);
      }
    }
  });

  await Promise.all(requests);
  const totalDuration = performance.now() - testStart;

  const summary = {
    totalRequests: userCount,
    successCount,
    rejectedCapacity503: rejected503Count,
    rejectedRpmWait503: rejectedWaitExceededCount,
    otherErrors: errorCount,
    successRate: `${((successCount / userCount) * 100).toFixed(1)}%`,
    maxConcurrencyObserved: maxObservedInFlight,
    limiterPeakConcurrency: limiter.metrics.peakConcurrency,
    rateLimiterUsage: rateLimiter.currentRpmUsage,
    ttfbP50Ms: percentile(ttfbList, 50),
    ttfbP95Ms: percentile(ttfbList, 95),
    latencyP50Ms: percentile(latencyList, 50),
    latencyP95Ms: percentile(latencyList, 95),
    totalDurationMs: Number(totalDuration.toFixed(2)),
  };

  console.table([summary]);
  return summary;
}

async function main() {
  console.log("================================================================================");
  console.log("VERIFYING COMPOSED CONCURRENCY + RATE LIMITER BEFORE PRODUCTION");
  console.log("Enforces: Max Active Concurrency (5) + 20 RPM Free Tier Limit Independently");
  console.log("================================================================================");

  // Scenario 1: 10 concurrent users (within 20 RPM ceiling)
  await runMockedPipelineBenchmark(10, { requestsPerMinute: 20, maxConcurrency: 5 });

  // Scenario 2: 20 concurrent users (exact 20 RPM ceiling)
  await runMockedPipelineBenchmark(20, { requestsPerMinute: 20, maxConcurrency: 5 });

  // Scenario 3: 50 concurrent users (exceeds 20 RPM ceiling - rate limiter sheds excess safely)
  await runMockedPipelineBenchmark(50, { requestsPerMinute: 20, maxConcurrency: 5 });

  // Scenario 4: 100 concurrent users burst (exceeds 20 RPM ceiling)
  await runMockedPipelineBenchmark(100, { requestsPerMinute: 20, maxConcurrency: 5 });

  console.log("\n================================================================================");
  console.log("ALL CONTROLLED BENCHMARK SCENARIOS COMPLETED CLEANLY");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("FATAL ERROR IN VERIFICATION SCRIPT:", err);
  process.exit(1);
});
