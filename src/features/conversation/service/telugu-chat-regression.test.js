import assert from "node:assert/strict";
import test from "node:test";
import { ConversationService } from "./conversation.service.js";
import { PromptBuilder } from "../../ai-context/builder/prompt.builder.js";
import { OpenAIProvider } from "../../../providers/openai/openai.provider.js";
import { MessageRole } from "../../../common/constants/message-role.js";
import { AppDataSource } from "../../../database/datasource.js";

// Mock database transaction runner
AppDataSource.createQueryRunner = () => ({
  connect: async () => {},
  startTransaction: async () => {},
  commitTransaction: async () => {},
  rollbackTransaction: async () => {},
  release: async () => {},
  manager: {},
});

function createMockConversationService({
  mockStreamEvents = [],
  streamError = null,
  initialHistory = [],
}) {
  let createdMessages = [];
  let capturedProviderCalls = [];

  const conversationId = "conv-telugu-123";
  const agentId = "agent-telugu-123";
  const projectId = "proj-telugu-123";
  const orgId = "org-telugu-123";

  const mockConversation = {
    id: conversationId,
    projectId,
    agentId,
    visitorId: "visitor-123",
    isHandover: false,
    isCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAgent = {
    id: agentId,
    name: "Customer Support Agent",
    projectId,
    visibility: "PUBLIC",
    model: "openai/gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 512,
    systemPrompt: "You are the official AI assistant for Shaivik Technologies.",
    project: {
      organizationId: orgId,
    },
  };

  const storedMessages = [...initialHistory];

  const mockMessageRepo = {
    async create(msg) {
      const saved = { ...msg, id: `msg-${Date.now()}-${Math.random()}`, createdAt: new Date() };
      createdMessages.push(saved);
      storedMessages.push(saved);
      return saved;
    },
    async createForStreaming(msg) {
      return this.create(msg);
    },
    async findRecentByConversationId(convId, limit = 20) {
      return storedMessages.slice(-limit);
    },
  };

  const mockConversationRepo = {
    async findById(id) {
      if (id === conversationId) return mockConversation;
      return null;
    },
    async findLatestByVisitorAndAgent() {
      return mockConversation;
    },
    async update(conv) {
      return conv;
    },
  };

  const mockAgentRepo = {
    async findByPublicKey() {
      return mockAgent;
    },
  };

  const mockAiProvider = {
    name: "openai",
    maxContextMessages: 30,
    async *stream(messages, options) {
      capturedProviderCalls.push({ messages: JSON.parse(JSON.stringify(messages)), options });
      if (streamError) {
        throw streamError;
      }
      for (const event of mockStreamEvents) {
        yield event;
      }
    },
    async chat(messages, options) {
      capturedProviderCalls.push({ messages: JSON.parse(JSON.stringify(messages)), options });
      if (streamError) {
        throw streamError;
      }
      return {
        choices: [
          {
            message: {
              content: mockStreamEvents
                .filter((e) => e.type === "token")
                .map((e) => e.content)
                .join(""),
            },
          },
        ],
      };
    },
  };

  const mockAiProviderFactory = {
    getProviderByName() {
      return mockAiProvider;
    },
  };

  const promptBuilder = new PromptBuilder();
  const mockAiContextService = {
    async buildPublic({ agent, project, conversation }) {
      return { agent, project, conversation };
    },
    buildSystemMessage(context, options) {
      return promptBuilder.build(context, options);
    },
  };

  const mockCheckPlanUsageUseCase = {
    async execute() {
      return {
        allowed: true,
        usage: {
          daily: { requests: 1 },
          visitor: { dailyMessages: 1 },
        },
        limits: {
          requestsPerDay: 50,
          messagesPerVisitorPerDay: 10,
        },
      };
    },
  };

  const mockKnowledgeSearchService = {
    async search() {
      return [];
    },
  };

  const mockGetPlatformConfigUseCase = {
    async getValue(key) {
      if (key === "AI_RAG_SYSTEM_PROMPT") {
        return "Answer using provided Knowledge Context.";
      }
      if (key === "AI_RAG_NO_CONTEXT_MESSAGE") {
        return "No relevant knowledge found.";
      }
      return "";
    },
  };

  const mockAgentToolRepo = {
    async findByAgentId() {
      return [];
    },
  };

  const mockAgentToolSchemaService = {
    toOllamaTools() {
      return [];
    },
  };

  const service = new ConversationService({
    conversationRepository: mockConversationRepo,
    messageRepository: mockMessageRepo,
    usageRepository: { async create() {} },
    agentRepository: mockAgentRepo,
    aiProviderFactory: mockAiProviderFactory,
    aiContextService: mockAiContextService,
    checkProjectAccessUseCase: { async execute() { return true; } },
    checkPlanUsageUseCase: mockCheckPlanUsageUseCase,
    knowledgeSearchService: mockKnowledgeSearchService,
    agentToolRepository: mockAgentToolRepo,
    agentToolSchemaService: mockAgentToolSchemaService,
    agentToolExecutorService: {},
    agentToolResolverService: {},
    getPlatformConfigUseCase: mockGetPlatformConfigUseCase,
  });

  return {
    service,
    capturedProviderCalls,
    createdMessages,
    mockConversation,
  };
}

test("1. Message ordering and roles are strictly chronological with system prompt first", async () => {
  const previousTurns = [
    { id: "m1", role: MessageRole.USER, content: "talk with me in telugu" },
    { id: "m2", role: MessageRole.ASSISTANT, content: "క్షమించండి, కానీ నేను తెలుగులో మాట్లాడలేను." },
  ];

  const mockEvents = [
    { type: "token", content: "అవును, " },
    { type: "token", content: "నేను మాట్లాడుతున్నాను!" },
  ];

  const { service, capturedProviderCalls } = createMockConversationService({
    mockStreamEvents: mockEvents,
    initialHistory: previousTurns,
  });

  const stream = service.streamPublicMessage(
    "pk_test",
    "ippudu matladav ka",
    "visitor-123",
    "conv-telugu-123",
  );

  const tokens = [];
  for await (const chunk of stream) {
    if (chunk.type === "token") {
      tokens.push(chunk.content);
    }
  }

  assert.equal(capturedProviderCalls.length, 1);
  const sentMessages = capturedProviderCalls[0].messages;

  // System message is first
  assert.equal(sentMessages[0].role, "system");
  assert.ok(sentMessages[0].content.includes("Multilingual and Language Guidelines"));

  // Prior conversation turns follow in chronological order
  assert.equal(sentMessages[sentMessages.length - 3].role, "user");
  assert.equal(sentMessages[sentMessages.length - 3].content, "talk with me in telugu");
  assert.equal(sentMessages[sentMessages.length - 2].role, "assistant");
  assert.equal(sentMessages[sentMessages.length - 2].content, "క్షమించండి, కానీ నేను తెలుగులో మాట్లాడలేను.");

  // Current turn is the last message
  assert.equal(sentMessages[sentMessages.length - 1].role, "user");
  assert.equal(sentMessages[sentMessages.length - 1].content, "ippudu matladav ka");
});

test("2. Current user message is included exactly once without duplication", async () => {
  const { service, capturedProviderCalls } = createMockConversationService({
    mockStreamEvents: [{ type: "token", content: "హలో!" }],
    initialHistory: [],
  });

  const stream = service.streamPublicMessage(
    "pk_test",
    "meeru ela unnaru?",
    "visitor-123",
    "conv-telugu-123",
  );

  for await (const _ of stream) {}

  const sentMessages = capturedProviderCalls[0].messages;
  const userMessages = sentMessages.filter((m) => m.role === "user");

  assert.equal(userMessages.length, 1, "Latest user message must appear exactly once");
  assert.equal(userMessages[0].content, "meeru ela unnaru?");
});

test("3. Correct accumulation of streamed text chunks", async () => {
  const chunks = ["నమస్కారం! ", "మీకు ", "ఏమిటి ", "కావాలి?"];
  const mockEvents = chunks.map((c) => ({ type: "token", content: c }));

  const { service, createdMessages } = createMockConversationService({
    mockStreamEvents: mockEvents,
    initialHistory: [],
  });

  const stream = service.streamPublicMessage(
    "pk_test",
    "నమస్కారం",
    "visitor-123",
    "conv-telugu-123",
  );

  let accumulated = "";
  for await (const chunk of stream) {
    if (chunk.type === "token") {
      accumulated += chunk.content;
    }
  }

  assert.equal(accumulated, chunks.join(""));

  const savedAssistantMsg = createdMessages.find((m) => m.role === MessageRole.ASSISTANT);
  assert.ok(savedAssistantMsg, "Assistant message must be persisted");
  assert.equal(savedAssistantMsg.content, chunks.join(""));
});

test("4. No stale response reused from earlier turn", async () => {
  const oldRefusal = "క్షమించండి, కానీ నేను తెలుగులో మాట్లాడలేను. మీకు సహాయం కావాలంటే, దయచేసి ఇంగ్లీష్‌లో అడగండి.";
  const newAnswer = "అవును, చెప్పండి! నేను తెలుగులో మీకు సహాయం చేయడానికి సిద్ధంగా ఉన్నాను.";

  const previousTurns = [
    { id: "m1", role: MessageRole.USER, content: "talk with me in telugu" },
    { id: "m2", role: MessageRole.ASSISTANT, content: oldRefusal },
  ];

  const { service, createdMessages } = createMockConversationService({
    mockStreamEvents: [{ type: "token", content: newAnswer }],
    initialHistory: previousTurns,
  });

  const stream = service.streamPublicMessage(
    "pk_test",
    "ippudu matladav ka",
    "visitor-123",
    "conv-telugu-123",
  );

  let result = "";
  for await (const chunk of stream) {
    if (chunk.type === "token") {
      result += chunk.content;
    }
  }

  assert.equal(result, newAnswer);
  assert.notEqual(result, oldRefusal, "Must not return stale response from previous turn");

  const latestSavedMsg = createdMessages[createdMessages.length - 1];
  assert.equal(latestSavedMsg.role, MessageRole.ASSISTANT);
  assert.equal(latestSavedMsg.content, newAnswer);
});

test("5. Telugu-script and Romanized Telugu prompts reach the provider unchanged", async () => {
  const testInputs = [
    "నమస్కారం, మీరు ఎలా ఉన్నారు?",
    "meeru ela unnaru?",
    "ippudu matladav ka",
    "nenu AI gurinchi telusukovali",
  ];

  for (const input of testInputs) {
    const { service, capturedProviderCalls } = createMockConversationService({
      mockStreamEvents: [{ type: "token", content: "సరే" }],
      initialHistory: [],
    });

    const stream = service.streamPublicMessage(
      "pk_test",
      input,
      "visitor-123",
      "conv-telugu-123",
    );

    for await (const _ of stream) {}

    const sentUserMsg = capturedProviderCalls[0].messages.find((m) => m.role === "user");
    assert.equal(sentUserMsg.content, input, `Input "${input}" must reach provider completely unchanged`);
  }
});

test("6. Existing RAG and agent instructions remain intact alongside multilingual rules", async () => {
  const promptBuilder = new PromptBuilder();
  const context = {
    agent: {
      name: "Shaivik Support",
      systemPrompt: "Answer questions strictly about Shaivik Technologies and its website/app development.",
    },
    aiSettings: {
      defaultInstructions: "Do not invent services or prices.",
      conversationRules: "Maintain a professional tone.",
      tone: "helpful",
      responseStyle: "concise",
    },
    organization: { name: "Shaivik Technologies" },
    project: { name: "Core Platform" },
  };

  const systemMsg = promptBuilder.build(context);

  // Original agent instructions are preserved
  assert.ok(systemMsg.content.includes("Answer questions strictly about Shaivik Technologies"));
  assert.ok(systemMsg.content.includes("Do not invent services or prices"));

  // Multilingual guidelines are present
  assert.ok(systemMsg.content.includes("Romanized Telugu Support"));
  assert.ok(systemMsg.content.includes("Never repeat a previous answer"));
  assert.ok(systemMsg.content.includes("Code-Switching"));
});

test("7. Provider failure throws error and does not return stale assistant message", async () => {
  const oldRefusal = "క్షమించండి, నేను తెలుగులో మాట్లాడలేను.";
  const previousTurns = [
    { id: "m1", role: MessageRole.USER, content: "telugu" },
    { id: "m2", role: MessageRole.ASSISTANT, content: oldRefusal },
  ];

  const { service, createdMessages } = createMockConversationService({
    streamError: new Error("OpenRouter rate limit or connection timeout"),
    initialHistory: previousTurns,
  });

  const stream = service.streamPublicMessage(
    "pk_test",
    "ippudu matladav ka",
    "visitor-123",
    "conv-telugu-123",
  );

  let errorThrown = false;
  try {
    for await (const chunk of stream) {
      if (chunk.type === "token") {
        assert.notEqual(chunk.content, oldRefusal, "Must never return stale assistant message on provider error");
      }
    }
  } catch (err) {
    errorThrown = true;
    assert.ok(err.message.includes("OpenRouter"), "Error must bubble up properly");
  }

  assert.ok(errorThrown, "Expected stream to fail with provider error");
  const newlyCreatedAssistantMsgs = createdMessages.filter((m) => m.role === MessageRole.ASSISTANT);
  assert.equal(newlyCreatedAssistantMsgs.length, 0, "No new assistant message should be saved on provider failure");
});
