import test from "node:test";
import assert from "node:assert/strict";
import { ProviderError } from "../../common/errors/ProviderError.js";
import { OpenAIProvider } from "../../providers/openai/openai.provider.js";
import { OllamaProvider } from "../../providers/ollama/ollama.provider.js";
import { OllamaEmbeddingProvider } from "../../providers/embeddings/ollama/ollama.embedding.provider.js";
import { ConversationService } from "../conversation/service/conversation.service.js";
import { createPublicChatController } from "./controller/public-chat.controller.js";
import { AppDataSource } from "../../database/datasource.js";

AppDataSource.createQueryRunner = () => ({
  connect: async () => {},
  startTransaction: async () => {},
  commitTransaction: async () => {},
  rollbackTransaction: async () => {},
  release: async () => {},
  manager: {},
});

test("ProviderError preserves structured diagnostic metadata", () => {
  const cause = new Error("Upstream Cloudflare 502 Bad Gateway");
  const err = new ProviderError("AI service temporarily unavailable.", {
    provider: "openai",
    model: "nvidia/nemotron-3-super-120b-a12b:free",
    upstreamStatus: 502,
    isTransient: true,
    cause,
  });

  assert.equal(err.name, "ProviderError");
  assert.equal(err.statusCode, 502);
  assert.equal(err.errorCode, "PROVIDER_ERROR");
  assert.equal(err.provider, "openai");
  assert.equal(err.model, "nvidia/nemotron-3-super-120b-a12b:free");
  assert.equal(err.upstreamStatus, 502);
  assert.equal(err.isTransient, true);
  assert.equal(err.cause, cause);
});

test("OpenAIProvider retries transient 502 and recovers before first token", async () => {
  let callCount = 0;
  const mockClient = {
    chat: {
      completions: {
        create: async () => {
          callCount++;
          if (callCount === 1) {
            const err = new Error("Bad Gateway");
            err.status = 502;
            throw err;
          }
          return (async function* () {
            yield { choices: [{ delta: { content: "Shaivik " } }] };
            yield { choices: [{ delta: { content: "Technologies" } }] };
            yield { usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 } };
          })();
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    getPlatformApiKeyValueUseCase: { execute: async () => "test-key" },
  });
  provider.getClient = async () => mockClient;

  const tokens = [];
  for await (const chunk of provider.stream([{ role: "user", content: "What services do you offer?" }])) {
    if (chunk.type === "token") tokens.push(chunk.content);
  }

  assert.equal(callCount, 2, "Should have retried after initial 502");
  assert.equal(tokens.join(""), "Shaivik Technologies");
});

test("OpenAIProvider does not retry permanent 401/403 errors", async () => {
  let callCount = 0;
  const mockClient = {
    chat: {
      completions: {
        create: async () => {
          callCount++;
          const err = new Error("Unauthorized");
          err.status = 401;
          throw err;
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    getPlatformApiKeyValueUseCase: { execute: async () => "invalid-key" },
  });
  provider.getClient = async () => mockClient;

  await assert.rejects(
    async () => {
      for await (const _ of provider.stream([{ role: "user", content: "Hi" }])) {}
    },
    (err) => {
      assert.equal(err instanceof ProviderError, true);
      assert.equal(err.upstreamStatus, 401);
      assert.equal(err.isTransient, false);
      return true;
    },
  );

  assert.equal(callCount, 1, "Permanent 401 must not be retried");
});

test("OpenAIProvider does not retry if failure occurs after tokens are yielded", async () => {
  let callCount = 0;
  const mockClient = {
    chat: {
      completions: {
        create: async () => {
          callCount++;
          return (async function* () {
            yield { choices: [{ delta: { content: "First token" } }] };
            const midStreamErr = new Error("Connection reset mid-stream");
            midStreamErr.status = 502;
            throw midStreamErr;
          })();
        },
      },
    },
  };

  const provider = new OpenAIProvider({
    getPlatformApiKeyValueUseCase: { execute: async () => "test-key" },
  });
  provider.getClient = async () => mockClient;

  const tokens = [];
  await assert.rejects(
    async () => {
      for await (const chunk of provider.stream([{ role: "user", content: "Hi" }])) {
        if (chunk.type === "token") tokens.push(chunk.content);
      }
    },
    (err) => {
      assert.equal(err instanceof ProviderError, true);
      return true;
    },
  );

  assert.equal(tokens.length, 1);
  assert.equal(tokens[0], "First token");
  assert.equal(callCount, 1, "Must not restart stream after tokens yielded");
});

test("OllamaProvider retries transient 502, marks worker unhealthy, and recovers", async () => {
  const worker1 = {
    id: "w1",
    baseUrl: "http://127.0.0.1:11434",
    healthStatus: "HEALTHY",
    activeRequests: 0,
  };
  const worker2 = {
    id: "w2",
    baseUrl: "http://127.0.0.1:11435",
    healthStatus: "HEALTHY",
    activeRequests: 0,
  };

  let selectedIndex = 0;
  const mockWorkerPool = {
    selectWorker: async () => {
      const w = selectedIndex === 0 ? worker1 : worker2;
      selectedIndex++;
      return w;
    },
  };

  const originalFetch = globalThis.fetch;
  let fetchAttempts = 0;

  globalThis.fetch = async (url) => {
    fetchAttempts++;
    if (url.includes("11434")) {
      return {
        ok: false,
        status: 502,
        text: async () => "502 Bad Gateway",
      };
    }
    // Worker 2 succeeds
    return {
      ok: true,
      status: 200,
      body: {
        getReader: () => {
          let readCount = 0;
          return {
            read: async () => {
              readCount++;
              if (readCount === 1) {
                const chunk = JSON.stringify({ message: { content: "Ollama online response" } }) + "\n";
                return { value: new TextEncoder().encode(chunk), done: false };
              }
              if (readCount === 2) {
                const doneChunk = JSON.stringify({ done: true, prompt_eval_count: 5, eval_count: 3 }) + "\n";
                return { value: new TextEncoder().encode(doneChunk), done: false };
              }
              return { done: true };
            },
          };
        },
      },
    };
  };

  try {
    const provider = new OllamaProvider({
      getPlatformConfigUseCase: {
        getValue: async () => "qwen3:8b",
      },
      workerPool: mockWorkerPool,
    });

    const tokens = [];
    for await (const chunk of provider.stream([{ role: "user", content: "Hi" }])) {
      if (chunk.type === "token") tokens.push(chunk.content);
    }

    assert.equal(worker1.healthStatus, "UNHEALTHY", "Worker 1 must be marked UNHEALTHY on 502");
    assert.equal(fetchAttempts, 2);
    assert.equal(tokens.join(""), "Ollama online response");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OllamaEmbeddingProvider retries transient 502 and recovers", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;

  globalThis.fetch = async () => {
    attempts++;
    if (attempts === 1) {
      return {
        ok: false,
        status: 502,
        text: async () => "Bad Gateway",
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ embeddings: [[0.1, 0.2, 0.3]] }),
    };
  };

  try {
    const provider = new OllamaEmbeddingProvider({
      getPlatformConfigUseCase: {
        getValue: async () => "http://127.0.0.1:11434",
      },
    });

    const result = await provider.embed(["What services do you offer?"], {
      model: "nomic-embed-text:latest",
    });

    assert.equal(attempts, 2, "Should have retried embedding after initial 502");
    assert.deepEqual(result, [[0.1, 0.2, 0.3]]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ConversationService.streamPublicMessage gracefully handles RAG embedding failure without failing chat", async () => {
  const mockAgent = {
    id: "agent-1",
    projectId: "proj-1",
    model: "qwen3:8b",
    temperature: 0.7,
    maxTokens: 500,
    visibility: "PUBLIC",
    project: { organizationId: "org-1" },
  };

  const mockAiProvider = {
    maxContextMessages: 20,
    stream: async function* () {
      yield { type: "token", content: "Response generated without RAG chunks" };
      yield { type: "usage", usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } };
    },
  };

  const mockKnowledgeSearchService = {
    search: async () => {
      const err = new ProviderError("Ollama embedding 502 Bad Gateway", {
        provider: "ollama",
        model: "nomic-embed-text:latest",
        upstreamStatus: 502,
      });
      throw err;
    },
  };

  const savedMessages = [];
  const service = new ConversationService({
    agentRepository: {
      findByPublicKey: async () => mockAgent,
    },
    conversationRepository: {
      findById: async () => null,
      findLatestByVisitorAndAgent: async () => null,
      createForStreaming: async (conv) => ({ ...conv, id: "conv-1" }),
      update: async () => {},
    },
    messageRepository: {
      create: async (msg) => savedMessages.push(msg),
      findRecentByConversationId: async () => [],
      delete: async () => {},
    },
    aiProviderFactory: {
      getProviderByName: () => mockAiProvider,
    },
    aiContextService: {
      buildPublic: async () => ({ instructions: "Help the user." }),
      buildSystemMessage: () => ({ role: "system", content: "System instructions." }),
    },
    knowledgeSearchService: mockKnowledgeSearchService,
    getPlatformConfigUseCase: {
      getValue: async () => "No context available.",
    },
    checkPlanUsageUseCase: {
      execute: async () => ({
        usage: { daily: { requests: 1 } },
        limits: { requestsPerDay: 50 },
      }),
    },
    usageRepository: { create: async () => {} },
  });

  service.validateAgentModelAccess = async () => true;
  service.getCompanyTimezone = async () => "Asia/Kolkata";

  const stream = service.streamPublicMessage(
    "agt_pk_valid",
    "What services does Shaivik Technologies offer?",
    "visitor-1",
  );

  const tokens = [];
  for await (const chunk of stream) {
    if (chunk.type === "token") tokens.push(chunk.content);
  }

  assert.equal(tokens.join(""), "Response generated without RAG chunks");
});

test("ConversationService.streamPublicMessage cleans up orphaned user message if provider fails before any tokens", async () => {
  const mockAgent = {
    id: "agent-1",
    projectId: "proj-1",
    model: "qwen3:8b",
    visibility: "PUBLIC",
    project: { organizationId: "org-1" },
  };

  const mockAiProvider = {
    maxContextMessages: 20,
    stream: async function* () {
      const err = new ProviderError("AI service temporarily unavailable (status 502).", {
        provider: "openai",
        upstreamStatus: 502,
      });
      throw err;
    },
  };

  const deletedMessageIds = [];
  const savedMessages = [];

  const service = new ConversationService({
    agentRepository: {
      findByPublicKey: async () => mockAgent,
    },
    conversationRepository: {
      findById: async () => null,
      findLatestByVisitorAndAgent: async () => null,
      createForStreaming: async (conv) => ({ ...conv, id: "conv-1" }),
      update: async () => {},
    },
    messageRepository: {
      create: async (msg) => {
        savedMessages.push(msg);
        return msg;
      },
      findRecentByConversationId: async () => [],
      delete: async (id) => deletedMessageIds.push(id),
    },
    aiProviderFactory: {
      getProviderByName: () => mockAiProvider,
    },
    aiContextService: {
      buildPublic: async () => ({ instructions: "Help the user." }),
      buildSystemMessage: () => ({ role: "system", content: "System instructions." }),
    },
    knowledgeSearchService: {
      search: async () => [],
    },
    getPlatformConfigUseCase: {
      getValue: async () => "",
    },
    checkPlanUsageUseCase: {
      execute: async () => ({
        usage: { daily: { requests: 1 } },
        limits: { requestsPerDay: 50 },
      }),
    },
    usageRepository: { create: async () => {} },
  });

  service.validateAgentModelAccess = async () => true;
  service.getCompanyTimezone = async () => "Asia/Kolkata";

  const stream = service.streamPublicMessage("agt_pk_valid", "What services do you offer?", "visitor-1");

  await assert.rejects(async () => {
    for await (const _ of stream) {}
  });

  assert.equal(savedMessages.length, 1);
  assert.equal(deletedMessageIds.length, 1);
  assert.equal(deletedMessageIds[0], savedMessages[0].id, "Orphaned user message must be deleted on pre-token failure");
});

test("publicChatController maps ProviderError to clean user-safe SSE message", async () => {
  const writtenEvents = [];
  const mockRes = {
    writableEnded: false,
    setHeader: () => {},
    on: () => {},
    write: (chunk) => writtenEvents.push(chunk),
    flush: () => {},
    end: () => {
      mockRes.writableEnded = true;
    },
  };

  const mockPublicChatStreamUseCase = {
    execute: async function* () {
      throw new ProviderError("Internal Server error status 502", {
        provider: "ollama",
        model: "qwen3:8b",
        upstreamStatus: 502,
      });
    },
  };

  const controller = createPublicChatController({
    publicChatStreamUseCase: mockPublicChatStreamUseCase,
  });

  const mockReq = {
    params: { publicKey: "agt_pk_test" },
    body: { message: "What services do you offer?" },
    headers: { "x-visitor-id": "visitor-1" },
  };

  await controller.streamPublicChat(mockReq, mockRes);

  const errorEvent = writtenEvents.find((evt) => evt.includes("event: error"));
  assert.equal(Boolean(errorEvent), true);
  assert.equal(
    errorEvent.includes("The AI service is temporarily unavailable. Please try again shortly."),
    true,
    "Must output friendly message instead of raw status 502",
  );
  assert.equal(errorEvent.includes("Internal Server error status 502"), false);
});

test("publicChatController maps status 530 to clean user-safe SSE message", async () => {
  const writtenEvents = [];
  const mockRes = {
    writableEnded: false,
    setHeader: () => {},
    on: () => {},
    write: (chunk) => writtenEvents.push(chunk),
    flush: () => {},
    end: () => {
      mockRes.writableEnded = true;
    },
  };

  const mockPublicChatStreamUseCase = {
    execute: async function* () {
      const err = new Error("Internal server error: Failed to get response from AI provider (status 530)");
      err.statusCode = 530;
      throw err;
    },
  };

  const controller = createPublicChatController({
    publicChatStreamUseCase: mockPublicChatStreamUseCase,
  });

  const mockReq = {
    params: { publicKey: "agt_pk_test" },
    body: { message: "Hello AI" },
    headers: { "x-visitor-id": "visitor-1" },
  };

  await controller.streamPublicChat(mockReq, mockRes);

  const errorEvent = writtenEvents.find((evt) => evt.includes("event: error"));
  assert.equal(Boolean(errorEvent), true);
  assert.equal(
    errorEvent.includes("The AI service is temporarily unavailable. Please try again shortly."),
    true,
    "Must output friendly message instead of raw status 530",
  );
  assert.equal(errorEvent.includes("status 530"), false);
});

test("ConversationService.streamPublicMessage preserves partial reply on mid-stream 530 interruption", async () => {
  const mockAgent = {
    id: "agent-1",
    projectId: "proj-1",
    model: "nvidia/nemotron-3-super-120b-a12b:free",
    visibility: "PUBLIC",
    project: { organizationId: "org-1" },
  };

  const mockAiProvider = {
    maxContextMessages: 20,
    stream: async function* () {
      yield { type: "token", content: "Shaivik AI provides intelligent " };
      yield { type: "token", content: "customer support automation." };
      const err = new Error("Stream connection interrupted by AI provider (530).");
      err.statusCode = 530;
      throw err;
    },
  };

  const savedMessages = [];

  const service = new ConversationService({
    agentRepository: {
      findByPublicKey: async () => mockAgent,
    },
    conversationRepository: {
      findById: async () => null,
      findLatestByVisitorAndAgent: async () => null,
      createForStreaming: async (conv) => ({ ...conv, id: "conv-1" }),
      update: async () => {},
    },
    messageRepository: {
      create: async (msg) => savedMessages.push(msg),
      findRecentByConversationId: async () => [],
      delete: async () => {},
    },
    aiProviderFactory: {
      getProviderByName: () => mockAiProvider,
    },
    aiContextService: {
      buildPublic: async () => ({ instructions: "Help the user." }),
      buildSystemMessage: () => ({ role: "system", content: "System instructions." }),
    },
    knowledgeSearchService: {
      search: async () => [],
    },
    getPlatformConfigUseCase: {
      getValue: async () => "No context available.",
    },
    checkPlanUsageUseCase: {
      execute: async () => ({
        usage: { daily: { requests: 1 } },
        limits: { requestsPerDay: 50 },
      }),
    },
    usageRepository: { create: async () => {} },
  });

  service.validateAgentModelAccess = async () => true;
  service.getCompanyTimezone = async () => "Asia/Kolkata";

  const stream = service.streamPublicMessage(
    "agt_pk_valid",
    "Tell me about Shaivik AI",
    "visitor-1",
  );

  const emittedTokens = [];
  let completed = false;

  for await (const chunk of stream) {
    if (chunk.type === "token") emittedTokens.push(chunk.content);
    if (chunk.type === "done") completed = true;
  }

  assert.equal(
    emittedTokens.join(""),
    "Shaivik AI provides intelligent customer support automation.",
    "Stream must emit generated tokens before interruption",
  );
  assert.equal(completed, true, "Stream must cleanly complete with done event despite mid-stream 530 error");
});

