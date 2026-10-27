import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppDataSource } from "../../database/datasource.js";
import { ConversationService } from "../conversation/service/conversation.service.js";
import { createPublicChatController } from "./controller/public-chat.controller.js";

// Mock transaction runner for isolated unit testing
AppDataSource.createQueryRunner = () => ({
  connect: async () => {},
  startTransaction: async () => {},
  commitTransaction: async () => {},
  rollbackTransaction: async () => {},
  release: async () => {},
  manager: {},
});

const mockPlatformConfig = {
  execute: async () => ({
    getValue: () => null,
  }),
};

describe("FEATURE: Dynamic State-Aware AI Response Status", () => {
  it("verifies provider resolution strictly selects production NVIDIA free model and never Ollama", () => {
    const service = new ConversationService({});

    // Agent with ollama provider configured
    const agentOllama = {
      provider: "ollama",
      model: "qwen3:8b",
    };
    const expectedModel = process.env.OPENAI_MODEL || "nvidia/nemotron-3.5-super-vl:free";
    const resolvedOllama = service._resolveProviderAndModel(agentOllama);
    assert.equal(resolvedOllama.providerName, "openai");
    assert.equal(resolvedOllama.modelName, expectedModel);

    // Agent with default settings
    const agentDefault = {};
    const resolvedDefault = service._resolveProviderAndModel(agentDefault);
    assert.equal(resolvedDefault.providerName, "openai");
    assert.equal(resolvedDefault.modelName, expectedModel);
  });

  it("yields genuine status events during public chat stream lifecycle (thinking -> knowledge search -> generating)", async () => {
    let searchCalled = false;
    const mockPlatformConfig = {
      getValue: async () => "",
    };
    const mockKnowledgeService = {
      search: async ({ projectId, query }) => {
        searchCalled = true;
        return [{ id: "k-1", content: "Knowledge base item" }];
      },
    };

    const mockAiProvider = {
      maxContextMessages: 10,
      stream: async function* () {
        yield { type: "token", content: "Hello! Here is the answer." };
        yield { type: "usage", usage: { inputTokens: 5, outputTokens: 6, totalTokens: 11 } };
      },
    };

    const mockAiProviderFactory = {
      getProviderByName: (name) => mockAiProvider,
    };

    const mockAgentRepo = {
      findByPublicKey: async (key) => ({
        id: "agent-1",
        projectId: "proj-1",
        visibility: "PUBLIC",
        temperature: 0.7,
        maxTokens: 500,
        project: { organizationId: "org-1" },
      }),
    };

    const mockMessageRepo = {
      findByConversationId: async () => [],
      findRecentByConversationId: async () => [],
      createForStreaming: async () => {},
      create: async () => {},
    };

    const mockConvRepo = {
      findById: async () => null,
      findLatestByVisitorAndAgent: async () => null,
      createForStreaming: async (conv) => ({ ...conv, id: "conv-1" }),
      update: async (conv) => conv,
    };

    const mockUsageRepo = {
      create: async () => {},
    };

    const mockAiContextService = {
      buildPublic: async () => "You are a helpful assistant",
      buildSystemMessage: () => ({ role: "system", content: "System prompt" }),
    };

    const mockCheckPlanUsageUseCase = {
      execute: async () => ({
        limits: { requestsPerDay: 100, messagesPerVisitorPerDay: 50 },
        usage: { daily: { requests: 5 }, visitor: { dailyMessages: 2 } },
      }),
    };

    const service = new ConversationService({
      conversationRepository: mockConvRepo,
      messageRepository: mockMessageRepo,
      usageRepository: mockUsageRepo,
      agentRepository: mockAgentRepo,
      aiProviderFactory: mockAiProviderFactory,
      aiContextService: mockAiContextService,
      checkPlanUsageUseCase: mockCheckPlanUsageUseCase,
      knowledgeSearchService: mockKnowledgeService,
      getPlatformConfigUseCase: mockPlatformConfig,
      checkProjectAccessUseCase: { execute: async () => {} },
    });

    service.validateAgentModelAccess = async () => {};

    // Execute streaming for a knowledge-seeking question
    const events = [];
    for await (const event of service.streamPublicMessage(
      "test-public-key",
      "Tell me about your product pricing and enterprise tiers",
      "visitor-123",
      null,
      null,
      { requestId: "req-test" },
    )) {
      events.push(event);
    }

    assert.equal(searchCalled, true, "Knowledge search service should have been genuinely invoked");

    const statusEvents = events.filter((e) => e.type === "status");
    assert.ok(statusEvents.length >= 2, "Stream should emit real-time status events");

    // 1. First status is thinking
    assert.equal(statusEvents[0].status, "thinking");
    assert.equal(statusEvents[0].label, "Thinking");

    // 2. Knowledge search status
    const knowledgeEvent = statusEvents.find((e) => e.status === "searching_knowledge");
    assert.ok(knowledgeEvent, "Should emit searching_knowledge when RAG knowledge search runs");
    assert.equal(knowledgeEvent.label, "Searching knowledge base");

    // 3. Generating status
    const generatingEvent = statusEvents.find((e) => e.status === "generating");
    assert.ok(generatingEvent, "Should emit generating when AI begins formulating tokens");
    assert.equal(generatingEvent.label, "Formulating response");

    // 4. Followed by tokens and done
    const tokenEvents = events.filter((e) => e.type === "token");
    assert.ok(tokenEvents.length > 0, "Should emit token chunks");

    const doneEvent = events.find((e) => e.type === "done");
    assert.ok(doneEvent, "Should emit done event at conclusion");
  });

  it("yields tool execution status when the AI provider calls an external tool", async () => {
    let toolCallExecuted = false;
    const mockPlatformConfig = {
      getValue: async () => "",
    };

    const mockAiProvider = {
      maxContextMessages: 10,
      stream: async function* (messages, options) {
        if (!toolCallExecuted) {
          // First pass: AI returns a tool call
          yield {
            type: "tool_calls",
            toolCalls: [
              {
                function: {
                  name: "check_stock_availability",
                  arguments: JSON.stringify({ item: "paint" }),
                },
              },
            ],
          };
        } else {
          // Second pass after tool execution: AI provides answer
          yield { type: "token", content: "The paint is in stock." };
        }
      },
    };

    const mockAiProviderFactory = {
      getProviderByName: () => mockAiProvider,
    };

    const mockAgentToolResolver = {
      resolve: async () => ({ id: "tool-1", name: "check_stock_availability" }),
    };

    const mockAgentToolExecutor = {
      execute: async () => {
        toolCallExecuted = true;
        return { inStock: true, quantity: 42 };
      },
    };

    const service = new ConversationService({
      conversationRepository: {
        findById: async () => null,
        findLatestByVisitorAndAgent: async () => null,
        createForStreaming: async (conv) => ({ ...conv, id: "conv-1" }),
        update: async (conv) => conv,
      },
      messageRepository: {
        findByConversationId: async () => [],
        findRecentByConversationId: async () => [],
        createForStreaming: async () => {},
        create: async () => {},
      },
      usageRepository: { create: async () => {} },
      agentRepository: {
        findByPublicKey: async () => ({
          id: "agent-1",
          projectId: "proj-1",
          visibility: "PUBLIC",
          temperature: 0.7,
          maxTokens: 500,
          project: { organizationId: "org-1" },
        }),
      },
      aiProviderFactory: mockAiProviderFactory,
      aiContextService: {
        buildPublic: async () => "Context",
        buildSystemMessage: () => ({ role: "system", content: "Prompt" }),
      },
      checkPlanUsageUseCase: {
        execute: async () => ({
          limits: { requestsPerDay: 100, messagesPerVisitorPerDay: 50 },
          usage: { daily: { requests: 5 }, visitor: { dailyMessages: 2 } },
        }),
      },
      agentToolResolverService: mockAgentToolResolver,
      agentToolExecutorService: mockAgentToolExecutor,
      getPlatformConfigUseCase: mockPlatformConfig,
      checkProjectAccessUseCase: { execute: async () => {} },
    });

    service.validateAgentModelAccess = async () => {};

    const events = [];
    for await (const event of service.streamPublicMessage(
      "test-public-key",
      "Do you have paint in stock?",
      "visitor-123",
      null,
      null,
      { requestId: "req-tool-test" },
    )) {
      events.push(event);
    }

    assert.equal(toolCallExecuted, true, "Tool should have been executed");

    const toolStatus = events.find((e) => e.type === "status" && e.status === "executing_tool");
    assert.ok(toolStatus, "Should yield executing_tool status event");
    assert.equal(toolStatus.toolName, "check_stock_availability");
    assert.equal(toolStatus.label, "Using check stock availability");
  });

  it("publicChatController serializes status events into SSE event: status format", async () => {
    const writtenEvents = [];
    const mockRes = {
      setHeader: () => {},
      write: (str) => {
        writtenEvents.push(str);
      },
      flush: () => {},
      end: () => {},
      on: () => {},
      writableEnded: false,
      writable: true,
      socket: { destroyed: false, setNoDelay: () => {} },
    };

    const mockService = {
      streamPublicMessage: async function* () {
        yield { type: "conversation", conversationId: "conv-99" };
        yield { type: "status", status: "thinking", label: "Thinking" };
        yield { type: "status", status: "searching_knowledge", label: "Searching knowledge base" };
        yield { type: "token", content: "Here is your answer." };
        yield { type: "done", messageId: "msg-1" };
      },
    };

    const controller = createPublicChatController({
      conversationService: mockService,
    });

    const mockReq = {
      body: { message: "Hello AI" },
      params: { publicKey: "pub-key-1" },
      headers: {},
      ip: "127.0.0.1",
    };

    await controller.streamPublicChat(mockReq, mockRes);

    const fullOutput = writtenEvents.join("");
    assert.ok(fullOutput.includes("event: status\n"), "SSE stream should contain event: status");
    assert.ok(
      fullOutput.includes('"status":"thinking"') && fullOutput.includes('"label":"Thinking"'),
      "SSE stream should include thinking status payload",
    );
    assert.ok(
      fullOutput.includes('"status":"searching_knowledge"') &&
        fullOutput.includes('"label":"Searching knowledge base"'),
      "SSE stream should include searching_knowledge status payload",
    );
  });
});
