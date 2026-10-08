import assert from "node:assert/strict";
import { ConversationService } from "./conversation.service.js";
import { AppDataSource } from "../../../database/datasource.js";

AppDataSource.createQueryRunner = () => ({
  connect: async () => {},
  startTransaction: async () => {},
  commitTransaction: async () => {},
  rollbackTransaction: async () => {},
  release: async () => {},
  manager: {},
});

let createdMessages = [];
let mockConversation = {
  id: "conv-123",
  projectId: "proj-123",
  agentId: "agent-123",
  visitorId: "wa_919876543210",
  isHandover: false,
  setHandoverMode(val) {
    this.isHandover = Boolean(val);
  },
};

let whatsappSent = [];

const mockConversationRepo = {
  async findById(id) {
    if (id === "conv-123") return mockConversation;
    return null;
  },
  async update(conv) {
    mockConversation = conv;
    return conv;
  },
};

const mockMessageRepo = {
  async create(msg) {
    createdMessages.push(msg);
    return { ...msg, id: "msg-123", createdAt: new Date().toISOString() };
  },
};

const mockWhatsappConnectionRepo = {
  async findByProjectId(projId) {
    return [
      { id: "conn-123", status: "CONNECTED", phoneNumber: "+919876543210" },
    ];
  },
};

const mockWhatsappProvider = {
  async sendMessage(conn, phone, text) {
    whatsappSent.push({ conn, phone, text });
    return { success: true };
  },
};

const mockCheckProjectAccess = {
  async execute() {
    return true;
  },
};

const service = new ConversationService({
  conversationRepository: mockConversationRepo,
  messageRepository: mockMessageRepo,
  checkProjectAccessUseCase: mockCheckProjectAccess,
  whatsappConnectionRepository: mockWhatsappConnectionRepo,
  whatsappProvider: mockWhatsappProvider,
});

// Test 1: toggleHandoverMode
await service.toggleHandoverMode({
  conversationId: "conv-123",
  isHandover: true,
});
assert.equal(mockConversation.isHandover, true);

// Test 2: sendAgentReply saves assistant message and dispatches outbound WhatsApp message
const reply = await service.sendAgentReply({
  userId: "user-123",
  conversationId: "conv-123",
  content: "Hello! I am a human support agent assisting you.",
});

assert.equal(reply.role, "assistant");
assert.equal(reply.content, "Hello! I am a human support agent assisting you.");
assert.equal(whatsappSent.length, 1);
assert.equal(whatsappSent[0].phone, "+919876543210");
assert.equal(
  whatsappSent[0].text,
  "Hello! I am a human support agent assisting you.",
);

// Test 3: isSameCalendarDay correctly matches dates in target timezone
const today = new Date();
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
assert.equal(
  service.isSameCalendarDay(today, new Date(), "Asia/Kolkata"),
  true,
);
assert.equal(
  service.isSameCalendarDay(yesterday, today, "Asia/Kolkata"),
  false,
);

// Test 4: getPublicActiveConversation returns active conversation for today and null for yesterday
let mockAgentRepo = {
  async findByPublicKey(key) {
    if (key === "pub-123") {
      return {
        id: "agent-123",
        visibility: "PUBLIC",
        project: { organizationId: "org-123" },
      };
    }
    return null;
  },
};

let mockConvRepoWithHistory = {
  latestConv: null,
  async findLatestByVisitorAndAgent(visitorId, agentId) {
    return this.latestConv;
  },
};

let mockMessageRepoWithHistory = {
  async findByConversationId(convId) {
    return [
      { id: "m-1", role: "user", content: "Hi", createdAt: new Date() },
      {
        id: "m-2",
        role: "assistant",
        content: "Hello!",
        createdAt: new Date(),
      },
    ];
  },
};

const activeConvService = new ConversationService({
  conversationRepository: mockConvRepoWithHistory,
  messageRepository: mockMessageRepoWithHistory,
  agentRepository: mockAgentRepo,
});

// Case A: Today's conversation exists -> returned
mockConvRepoWithHistory.latestConv = {
  id: "conv-today",
  agentId: "agent-123",
  visitorId: "vis-123",
  isHandover: false,
  createdAt: new Date(),
};

const todayActive = await activeConvService.getPublicActiveConversation(
  "pub-123",
  "vis-123",
);
assert.equal(todayActive.conversation?.id, "conv-today");
assert.equal(todayActive.messages.length, 2);

// Case B: Yesterday's conversation exists -> returned null (fresh start for new day)
mockConvRepoWithHistory.latestConv = {
  id: "conv-yesterday",
  agentId: "agent-123",
  visitorId: "vis-123",
  isHandover: false,
  createdAt: yesterday,
};

const yesterdayActive = await activeConvService.getPublicActiveConversation(
  "pub-123",
  "vis-123",
);
assert.equal(yesterdayActive.conversation, null);
assert.equal(yesterdayActive.messages.length, 0);

// Test 5: streamPublicMessage during active handover generates NO repeated assistant notices
let assistantNoticeCount = 0;
let testMessages = [];
const mockHandoverService = new ConversationService({
  conversationRepository: {
    async findById() {
      return {
        id: "conv-handover",
        agentId: "agent-123",
        visitorId: "vis-123",
        isHandover: true,
      };
    },
    async findLatestByVisitorAndAgent() {
      return {
        id: "conv-handover",
        agentId: "agent-123",
        visitorId: "vis-123",
        isHandover: true,
        createdAt: new Date(),
      };
    },
  },
  messageRepository: {
    async create(msg) {
      testMessages.push(msg);
      if (msg.role === "assistant") assistantNoticeCount++;
      return msg;
    },
  },
  agentRepository: mockAgentRepo,
  checkPlanUsageUseCase: {
    async execute() {
      return {
        usage: { daily: { requests: 1 } },
        limits: { requestsPerDay: 100 },
      };
    },
  },
});

const streamEvents = [];
for await (const event of mockHandoverService.streamPublicMessage(
  "pub-123",
  "I need an app",
  "vis-123",
  "conv-handover",
)) {
  streamEvents.push(event);
}

assert.equal(
  assistantNoticeCount,
  0,
  "No assistant handover notice should be created when handover is active",
);
assert.equal(streamEvents.length, 2);
assert.equal(streamEvents[0].type, "conversation");
assert.equal(streamEvents[1].type, "done");

// Test 6: sendPublicMessage during active handover returns reply: null and 0 assistant notices
assistantNoticeCount = 0;
const sendResult = await mockHandoverService.sendPublicMessage(
  "pub-123",
  "I need an app",
  "vis-123",
  "conv-handover",
);
assert.equal(sendResult.reply, null);
assert.equal(sendResult.isHandover, true);
assert.equal(
  assistantNoticeCount,
  0,
  "sendPublicMessage should create 0 assistant notices during active handover",
);

// Test 7: streamPublicMessage ignores completed conversation for today and creates a new conversation
let createdNewConv = false;
const mockCompletedConvService = new ConversationService({
  conversationRepository: {
    async findById() {
      return {
        id: "conv-completed",
        agentId: "agent-123",
        visitorId: "vis-123",
        isCompleted: true,
        createdAt: new Date(),
      };
    },
    async findLatestByVisitorAndAgent() {
      return {
        id: "conv-completed",
        agentId: "agent-123",
        visitorId: "vis-123",
        isCompleted: true,
        createdAt: new Date(),
      };
    },
    async createForStreaming(conv) {
      createdNewConv = true;
      return { ...conv, id: "conv-new-123", isHandover: true };
    },
  },
  messageRepository: {
    async create(msg) {
      return msg;
    },
  },
  agentRepository: mockAgentRepo,
  checkPlanUsageUseCase: {
    async execute() {
      return {
        usage: { daily: { requests: 1 } },
        limits: { requestsPerDay: 100 },
      };
    },
  },
});

const completedStreamEvents = [];
for await (const event of mockCompletedConvService.streamPublicMessage(
  "pub-123",
  "Hello new chat",
  "vis-123",
  "conv-completed",
)) {
  completedStreamEvents.push(event);
  if (event.type === "conversation") {
    assert.equal(event.conversationId, "conv-new-123");
  }
}
assert.equal(
  createdNewConv,
  true,
  "New conversation should be created when candidate or existing conversation is completed",
);
