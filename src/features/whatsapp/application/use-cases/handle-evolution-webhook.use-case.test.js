import test from "node:test";
import assert from "node:assert/strict";
import { HandleEvolutionWebhookUseCase } from "./handle-evolution-webhook.use-case.js";

test("HandleEvolutionWebhookUseCase processes CONNECTION_UPDATE open event", async () => {
  let updatedStatus = null;
  const mockWhatsappRepo = {
    async findByEvolutionInstanceName() {
      return { id: "conn-123", provider: "EVOLUTION", status: "DISCONNECTED" };
    },
    async update(id, updates) {
      updatedStatus = updates.status;
      return { id, status: updates.status };
    },
  };
  const mockPlatformRepo = {
    async findByEvolutionInstanceName() {
      return null;
    },
  };

  const useCase = new HandleEvolutionWebhookUseCase({
    whatsappConnectionRepository: mockWhatsappRepo,
    platformWhatsappConnectionRepository: mockPlatformRepo,
  });

  const result = await useCase.execute({
    event: "CONNECTION_UPDATE",
    instance: "inst-123",
    data: { state: "open", phoneNumber: "919876543210" },
  });

  assert.equal(result.handled, true);
  assert.equal(updatedStatus, "CONNECTED");
});

test("HandleEvolutionWebhookUseCase handles incoming MESSAGES_UPSERT and triggers AI bot response", async () => {
  let sentMessage = null;
  const mockWhatsappRepo = {
    async findByEvolutionInstanceName() {
      return {
        id: "conn-123",
        provider: "EVOLUTION",
        projectId: "proj-123",
        agentId: "agent-123",
      };
    },
  };
  const mockPlatformRepo = {
    async findByEvolutionInstanceName() {
      return null;
    },
  };

  const mockConvRepo = {
    async findAllByProject() {
      return [];
    },
    async create(conv) {
      return conv;
    },
    async update(conv) {
      return conv;
    },
  };

  const mockConvService = {
    async sendMessagePublic() {
      return { reply: "Hello! How can I assist you today?" };
    },
  };

  const mockProvider = {
    async sendMessage(connection, number, text) {
      sentMessage = { number, text };
    },
  };

  const useCase = new HandleEvolutionWebhookUseCase({
    whatsappConnectionRepository: mockWhatsappRepo,
    platformWhatsappConnectionRepository: mockPlatformRepo,
    conversationRepository: mockConvRepo,
    conversationService: mockConvService,
    whatsappProvider: mockProvider,
  });

  const result = await useCase.execute({
    event: "MESSAGES_UPSERT",
    instance: "inst-123",
    data: {
      key: { remoteJid: "919876543210@s.whatsapp.net", fromMe: false },
      message: { conversation: "Hello AI Bot" },
    },
  });

  assert.equal(result.handled, true);
  assert.equal(result.reply, "Hello! How can I assist you today?");
  assert.equal(sentMessage.number, "+919876543210");
  assert.equal(sentMessage.text, "Hello! How can I assist you today?");
});

test("HandleEvolutionWebhookUseCase detects handover keyword and switches mode to isHandover", async () => {
  let handoverNotification = null;
  const mockWhatsappRepo = {
    async findByEvolutionInstanceName() {
      return {
        id: "conn-123",
        provider: "EVOLUTION",
        projectId: "proj-123",
        agentId: "agent-123",
      };
    },
  };
  const mockPlatformRepo = {
    async findByEvolutionInstanceName() {
      return null;
    },
  };

  const mockConvRepo = {
    async findAllByProject() {
      return [];
    },
    async create(conv) {
      return conv;
    },
    async update(conv) {
      return conv;
    },
  };

  const mockConvService = {
    async toggleHandoverMode({ conversationId, isHandover }) {
      return { id: conversationId, isHandover, setHandoverMode() {} };
    },
  };

  const mockProvider = {
    async sendMessage(connection, number, text) {
      handoverNotification = { number, text };
    },
  };

  const useCase = new HandleEvolutionWebhookUseCase({
    whatsappConnectionRepository: mockWhatsappRepo,
    platformWhatsappConnectionRepository: mockPlatformRepo,
    conversationRepository: mockConvRepo,
    conversationService: mockConvService,
    whatsappProvider: mockProvider,
  });

  const result = await useCase.execute({
    event: "MESSAGES_UPSERT",
    instance: "inst-123",
    data: {
      key: { remoteJid: "919876543210@s.whatsapp.net", fromMe: false },
      message: { conversation: "I want to talk to a human agent please" },
    },
  });

  assert.equal(result.handled, true);
  assert.equal(result.reason, "HANDOVER_TRIGGERED");
  assert.equal(handoverNotification.number, "+919876543210");
  assert.match(handoverNotification.text, /human support agent/);
});
