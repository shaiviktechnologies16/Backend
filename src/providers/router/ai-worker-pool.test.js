import test from "node:test";
import assert from "node:assert/strict";
import { AIWorkerPool } from "./ai-worker-pool.js";
import { AIInferenceRouter } from "./ai-inference-router.js";

test("AIWorkerPool falls back to single default worker when AI_WORKERS is empty", async () => {
  const mockConfigUseCase = {
    getValue: async (key) => {
      if (key === "AI_WORKERS") return "";
      if (key === "OLLAMA_BASE_URL") return "http://127.0.0.1:11434";
      if (key === "OLLAMA_MODEL") return "qwen3:8b";
      return null;
    },
  };

  const pool = new AIWorkerPool({
    getPlatformConfigUseCase: mockConfigUseCase,
  });

  const workers = await pool.getWorkers();

  assert.equal(workers.length, 1);
  assert.equal(workers[0].id, "ollama-default");
  assert.equal(workers[0].baseUrl, "http://127.0.0.1:11434");
  assert.equal(workers[0].model, "qwen3:8b");
});

test("AIWorkerPool parses multi-worker JSON configuration correctly", async () => {
  const mockWorkers = JSON.stringify([
    {
      id: "node-1",
      provider: "ollama",
      baseUrl: "http://node1:11434",
      model: "qwen3:8b",
    },
    {
      id: "node-2",
      provider: "ollama",
      baseUrl: "http://node2:11434",
      model: "qwen3:8b",
    },
  ]);

  const mockConfigUseCase = {
    getValue: async (key) => {
      if (key === "AI_WORKERS") return mockWorkers;
      return null;
    },
  };

  const pool = new AIWorkerPool({
    getPlatformConfigUseCase: mockConfigUseCase,
  });

  const workers = await pool.getWorkers();

  assert.equal(workers.length, 2);
  assert.equal(workers[0].id, "node-1");
  assert.equal(workers[1].id, "node-2");
});

test("AIWorkerPool selects worker with least active requests", async () => {
  const mockWorkers = JSON.stringify([
    {
      id: "node-1",
      provider: "ollama",
      baseUrl: "http://node1:11434",
      model: "qwen3:8b",
    },
    {
      id: "node-2",
      provider: "ollama",
      baseUrl: "http://node2:11434",
      model: "qwen3:8b",
    },
  ]);

  const pool = new AIWorkerPool({
    getPlatformConfigUseCase: {
      getValue: async () => mockWorkers,
    },
  });

  const workers = await pool.getWorkers();
  workers[0].healthStatus = "HEALTHY";
  workers[1].healthStatus = "HEALTHY";
  workers[0].lastHealthCheckAt = Date.now();
  workers[1].lastHealthCheckAt = Date.now();

  workers[0].activeRequests = 3;
  workers[1].activeRequests = 1;

  const selected = await pool.selectWorker({
    provider: "ollama",
    model: "qwen3:8b",
  });
  assert.equal(selected.id, "node-2");
});

test("AIInferenceRouter delegates routing correctly for Ollama and OpenAI providers", async () => {
  let ollamaCalled = false;
  let openAiCalled = false;

  const mockOllama = {
    async chat() {
      ollamaCalled = true;
      return { source: "ollama" };
    },
    async *stream() {
      yield { type: "token", content: "ollama" };
    },
  };

  const mockOpenAI = {
    async chat() {
      openAiCalled = true;
      return { source: "openai" };
    },
    async *stream() {
      yield { type: "token", content: "openai" };
    },
  };

  const mockPool = {
    selectWorker: async () => ({ id: "w1", healthStatus: "HEALTHY" }),
  };

  const router = new AIInferenceRouter({
    workerPool: mockPool,
    ollamaProvider: mockOllama,
    openAIProvider: mockOpenAI,
  });

  await router.chat([], { provider: "ollama" });
  assert.equal(ollamaCalled, true);

  await router.chat([], { provider: "openai" });
  assert.equal(openAiCalled, true);
});
