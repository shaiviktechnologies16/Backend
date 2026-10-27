import test from "node:test";
import assert from "node:assert/strict";
import { OpenAIProvider } from "./openai.provider.js";
import { ModelFailoverManager } from "./model-failover-manager.js";
import { ProviderError } from "../../common/errors/ProviderError.js";

const PRIMARY_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
const FALLBACK_1 = "nvidia/nemotron-3.5-super-vl:free";
const FALLBACK_2 = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
const EMBED_MODEL = "nvidia/nemotron-3-embed-1b:free";

function createMockLimiter() {
  return {
    acquire: async () => () => {},
    pauseFor: () => {},
    getMetrics: () => ({ active: 0, queued: 0 }),
  };
}

function createMockRateLimiter() {
  return {
    acquire: async () => () => {},
    pauseFor: () => {},
    getMetrics: () => ({ rpm: 20 }),
  };
}

test("Scenario 1: Primary model succeeds immediately", async () => {
  const attemptedModels = [];
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          attemptedModels.push(params.model);
          return {
            choices: [{ message: { role: "assistant", content: "Primary success" } }],
          };
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  const result = await provider.chat([{ role: "user", content: "Hello" }]);

  assert.equal(attemptedModels.length, 1);
  assert.equal(attemptedModels[0], PRIMARY_MODEL);
  assert.equal(result.model, PRIMARY_MODEL);
  assert.equal(result.choices[0].message.content, "Primary success");
  assert.equal(result.message.content, "Primary success");
});

test("Scenario 2: Primary fails with 502/5xx; Fallback 1 succeeds", async () => {
  const attemptedModels = [];
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          attemptedModels.push(params.model);
          if (params.model === PRIMARY_MODEL) {
            const err = new Error("Bad Gateway from OpenRouter");
            err.status = 502;
            throw err;
          }
          return {
            choices: [{ message: { role: "assistant", content: "Fallback 1 success" } }],
          };
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  const result = await provider.chat([{ role: "user", content: "Hello" }]);

  assert.equal(attemptedModels.length, 2);
  assert.equal(attemptedModels[0], PRIMARY_MODEL);
  assert.equal(attemptedModels[1], FALLBACK_1);
  assert.equal(result.model, FALLBACK_1);
  assert.equal(result.choices[0].message.content, "Fallback 1 success");
});

test("Scenario 3: Primary and Fallback 1 fail with 5xx; Fallback 2 succeeds", async () => {
  const attemptedModels = [];
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          attemptedModels.push(params.model);
          if (params.model === PRIMARY_MODEL) {
            const err = new Error("Service Unavailable");
            err.status = 503;
            throw err;
          }
          if (params.model === FALLBACK_1) {
            const err = new Error("Gateway Timeout");
            err.status = 504;
            throw err;
          }
          return {
            choices: [{ message: { role: "assistant", content: "Fallback 2 success" } }],
          };
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  const result = await provider.chat([{ role: "user", content: "Hello" }]);

  assert.equal(attemptedModels.length, 3);
  assert.equal(attemptedModels[0], PRIMARY_MODEL);
  assert.equal(attemptedModels[1], FALLBACK_1);
  assert.equal(attemptedModels[2], FALLBACK_2);
  assert.equal(result.model, FALLBACK_2);
  assert.equal(result.choices[0].message.content, "Fallback 2 success");
});

test("Scenario 4: All models in chain fail gracefully with ProviderError", async () => {
  const attemptedModels = [];
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          attemptedModels.push(params.model);
          const err = new Error("Internal Server Error");
          err.status = 500;
          throw err;
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  await assert.rejects(
    async () => {
      await provider.chat([{ role: "user", content: "Hello" }]);
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.isTransient, true);
      assert.ok(err.message.includes("All fallback models failed"));
      assert.deepEqual(err.attemptedModels, [PRIMARY_MODEL, FALLBACK_1, FALLBACK_2]);
      return true;
    },
  );

  assert.equal(attemptedModels.length, 3);
});

test("Scenario 5: Primary times out (ETIMEDOUT); fallback succeeds", async () => {
  const attemptedModels = [];
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          attemptedModels.push(params.model);
          if (params.model === PRIMARY_MODEL) {
            const err = new Error("Connection timed out");
            err.code = "ETIMEDOUT";
            throw err;
          }
          return {
            choices: [{ message: { role: "assistant", content: "Recovered after timeout" } }],
          };
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  const result = await provider.chat([{ role: "user", content: "Ping" }]);

  assert.equal(attemptedModels.length, 2);
  assert.equal(attemptedModels[0], PRIMARY_MODEL);
  assert.equal(attemptedModels[1], FALLBACK_1);
  assert.equal(result.model, FALLBACK_1);
});

test("Scenario 6: Primary returns HTTP 429 with Retry-After; fallback succeeds and limiter pauses", async () => {
  let pauseDuration = 0;
  const mockLimiter = {
    acquire: async () => () => {},
    pauseFor: (ms) => {
      pauseDuration = ms;
    },
    getMetrics: () => ({}),
  };

  const attemptedModels = [];
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          attemptedModels.push(params.model);
          if (params.model === PRIMARY_MODEL) {
            const err = new Error("Rate limit exceeded");
            err.status = 429;
            err.headers = { "retry-after": "2" };
            throw err;
          }
          return {
            choices: [{ message: { role: "assistant", content: "Rate limit failover" } }],
          };
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: mockLimiter,
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  const result = await provider.chat([{ role: "user", content: "Test 429" }]);

  assert.equal(attemptedModels.length, 2);
  assert.equal(pauseDuration, 2000);
  assert.equal(result.model, FALLBACK_1);
});

test("Scenario 7: Authentication failure (401) stops immediately without retrying fallbacks", async () => {
  const attemptedModels = [];
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          attemptedModels.push(params.model);
          const err = new Error("Unauthorized - invalid api key");
          err.status = 401;
          throw err;
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  await assert.rejects(
    async () => {
      await provider.chat([{ role: "user", content: "Auth check" }]);
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.upstreamStatus, 401);
      assert.equal(err.isTransient, false);
      return true;
    },
  );

  assert.equal(attemptedModels.length, 1);
});

test("Scenario 8: Client error (HTTP 400 Bad Request) stops immediately", async () => {
  const attemptedModels = [];
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          attemptedModels.push(params.model);
          const err = new Error("Bad Request - invalid parameter");
          err.status = 400;
          throw err;
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  await assert.rejects(
    async () => {
      await provider.chat([{ role: "user", content: "Malformed request" }]);
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.upstreamStatus, 400);
      assert.equal(err.isTransient, false);
      return true;
    },
  );

  assert.equal(attemptedModels.length, 1);
});

test("Scenario 9: Tool schemas are preserved across model fallback attempts", async () => {
  const toolsPassed = [];
  const mockTools = [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Fetch weather",
        parameters: { type: "object", properties: { city: { type: "string" } } },
      },
    },
  ];

  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          toolsPassed.push({ model: params.model, tools: params.tools });
          if (params.model === PRIMARY_MODEL) {
            const err = new Error("503 Gateway");
            err.status = 503;
            throw err;
          }
          return {
            choices: [
              {
                message: {
                  role: "assistant",
                  content: null,
                  tool_calls: [
                    {
                      id: "call_123",
                      type: "function",
                      function: { name: "get_weather", arguments: '{"city":"Hyderabad"}' },
                    },
                  ],
                },
              },
            ],
          };
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  const result = await provider.chat([{ role: "user", content: "Weather in Hyderabad" }], {
    tools: mockTools,
  });

  assert.equal(toolsPassed.length, 2);
  assert.deepEqual(toolsPassed[0].tools, mockTools);
  assert.deepEqual(toolsPassed[1].tools, mockTools);
  assert.equal(result.model, FALLBACK_1);
  assert.equal(result.message.tool_calls[0].function.name, "get_weather");
});

test("Scenario 10: Multimodal request (vision) filters out text-only models", async () => {
  const manager = new ModelFailoverManager();
  const multimodalMessages = [
    {
      role: "user",
      content: [
        { type: "text", text: "What is in this image?" },
        { type: "image_url", image_url: { url: "https://example.com/photo.jpg" } },
      ],
    },
  ];

  const candidates = manager.getCandidateChain({
    messages: multimodalMessages,
  });

  // Only the vision-capable model should be in the eligible candidate chain
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0], FALLBACK_1);
  assert.ok(!candidates.includes(PRIMARY_MODEL));
  assert.ok(!candidates.includes(FALLBACK_2));
  assert.ok(!candidates.includes(EMBED_MODEL));
});

test("Scenario 11: Streaming fails before first token; transparently fails over to next model", async () => {
  const attemptedModels = [];
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          attemptedModels.push(params.model);
          if (params.model === PRIMARY_MODEL) {
            const err = new Error("503 Service Unavailable");
            err.status = 503;
            throw err;
          }
          return (async function* () {
            yield { choices: [{ delta: { content: "Streaming " } }] };
            yield { choices: [{ delta: { content: "recovered!" } }] };
            yield { usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } };
          })();
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  const events = [];
  for await (const event of provider.stream([{ role: "user", content: "Stream test" }])) {
    events.push(event);
  }

  assert.equal(attemptedModels.length, 2);
  assert.equal(attemptedModels[0], PRIMARY_MODEL);
  assert.equal(attemptedModels[1], FALLBACK_1);

  const modelEvent = events.find((e) => e.type === "model");
  assert.ok(modelEvent);
  assert.equal(modelEvent.model, FALLBACK_1);

  const tokens = events.filter((e) => e.type === "token").map((e) => e.content);
  assert.deepEqual(tokens, ["Streaming ", "recovered!"]);
});

test("Scenario 12: Streaming fails after output has started; halts cleanly without duplicating stream", async () => {
  const attemptedModels = [];
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          attemptedModels.push(params.model);
          return (async function* () {
            yield { choices: [{ delta: { content: "First partial token" } }] };
            const err = new Error("Connection terminated mid-stream");
            err.status = 500;
            throw err;
          })();
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  await assert.rejects(
    async () => {
      // Consume the generator
      for await (const _ of provider.stream([{ role: "user", content: "Mid-stream drop" }])) {}
    },
    (err) => {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.tokensEmitted, true);
      assert.equal(err.tokensEmittedCount, 1);
      return true;
    },
  );

  // Crucial: Fallback model MUST NOT be attempted once tokens were already dispatched
  assert.equal(attemptedModels.length, 1);
  assert.equal(attemptedModels[0], PRIMARY_MODEL);
});

test("Scenario 13: Client disconnects during streaming (AbortSignal); cleans up cleanly", async () => {
  const controller = new AbortController();
  const mockClient = {
    chat: {
      completions: {
        create: async () => {
          return (async function* () {
            yield { choices: [{ delta: { content: "chunk 1" } }] };
            controller.abort();
            yield { choices: [{ delta: { content: "chunk 2" } }] };
          })();
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  const events = [];
  for await (const event of provider.stream([{ role: "user", content: "Abort test" }], {
    signal: controller.signal,
  })) {
    events.push(event);
  }

  // Yielded the first chunk before abort, then gracefully terminated
  assert.ok(events.length >= 1);
});

test("Scenario 14: User messages are not duplicated during fallback retries", async () => {
  const sentPayloads = [];
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          sentPayloads.push(params.messages);
          if (params.model === PRIMARY_MODEL) {
            const err = new Error("502");
            err.status = 502;
            throw err;
          }
          return { choices: [{ message: { role: "assistant", content: "OK" } }] };
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  const originalMessages = [{ role: "user", content: "Original single message" }];
  await provider.chat(originalMessages);

  assert.equal(sentPayloads.length, 2);
  assert.equal(sentPayloads[0].length, 1);
  assert.equal(sentPayloads[1].length, 1);
  assert.equal(sentPayloads[1][0].content, "Original single message");
});

test("Scenario 15: Retries do not execute external tool side effects multiple times", async () => {
  let externalToolExecutionCount = 0;

  const executeExternalSideEffect = () => {
    externalToolExecutionCount++;
    return { status: "booked" };
  };

  // Simulating provider failover before any tool call was emitted
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          if (params.model === PRIMARY_MODEL) {
            const err = new Error("503");
            err.status = 503;
            throw err;
          }
          return {
            choices: [
              {
                message: {
                  role: "assistant",
                  content: null,
                  tool_calls: [{ function: { name: "book_ticket" } }],
                },
              },
            ],
          };
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  const response = await provider.chat([{ role: "user", content: "Book me a ticket" }], {
    tools: [{ type: "function", function: { name: "book_ticket" } }],
  });

  // Verify tool execution only happens on successful final model completion
  if (response.message?.tool_calls?.length > 0) {
    executeExternalSideEffect();
  }

  assert.equal(externalToolExecutionCount, 1);
});

test("Scenario 16: Actual responding model and metrics are recorded correctly", async () => {
  const mockClient = {
    chat: {
      completions: {
        create: async (params) => {
          if (params.model === PRIMARY_MODEL) {
            const err = new Error("530 Cloudflare");
            err.status = 530;
            throw err;
          }
          return {
            choices: [{ message: { role: "assistant", content: "Metrics test" } }],
          };
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    limiter: createMockLimiter(),
    rateLimiter: createMockRateLimiter(),
  });
  provider.getClient = async () => mockClient;

  const response = await provider.chat([{ role: "user", content: "Record metrics" }]);

  assert.equal(response.model, FALLBACK_1);

  const metrics = provider.getConcurrencyMetrics();
  assert.ok(metrics.failover);
  assert.equal(metrics.failover.metrics.fallbackActivations, 1);
  assert.equal(metrics.failover.metrics.fallbackSuccesses, 1);
  assert.equal(metrics.failover.metrics.totalRequests, 1);
});

test("Scenario 17: Missing or malformed fallback configuration degrades gracefully", async () => {
  const manager = new ModelFailoverManager({
    primaryModel: "nvidia/nemotron-3-super-120b-a12b:free",
    fallbackModels: " , ,, invalid-empty-entries, ",
  });

  const candidates = manager.getCandidateChain();
  assert.ok(candidates.length >= 1);
  assert.equal(candidates[0], PRIMARY_MODEL);
});

