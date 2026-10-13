import test from "node:test";
import assert from "node:assert/strict";

import { AddModelAccessUseCase } from "./application/use-cases/add-model-access.usecase.js";
import { RemoveModelAccessUseCase } from "./application/use-cases/remove-model-access.usecase.js";
import { GetOrganizationModelsUseCase } from "./application/use-cases/get-organization-models.usecase.js";
import { UpdateAgentUseCase } from "../../agent/application/use-cases/update-agent.usecase.js";
import { ConversationService } from "../../conversation/service/conversation.service.js";

test("AddModelAccessUseCase validates organization and model existence, persists access, and triggers cache invalidation", async () => {
  let invalidatedOrgId = null;
  const mockOrgRepo = {
    findById: async (id) => (id === "org-1" ? { id: "org-1", name: "Test Org" } : null),
  };
  const mockModelRepo = {
    findById: async (id) =>
      id === "model-chat-1"
        ? { id: "model-chat-1", capability: "CHAT", status: "ACTIVE", provider: "ollama", model: "qwen3:8b" }
        : id === "model-embed-1"
          ? { id: "model-embed-1", capability: "EMBEDDING", status: "ACTIVE" }
          : null,
  };
  const accessRecords = new Map();
  const mockAccessRepo = {
    findOne: async (orgId, modelId) => accessRecords.get(`${orgId}:${modelId}`) || null,
    create: async (data) => {
      const record = { id: "acc-1", ...data, aiModel: await mockModelRepo.findById(data.aiModelId) };
      accessRecords.set(`${data.organizationId}:${data.aiModelId}`, record);
      return record;
    },
  };

  const usecase = new AddModelAccessUseCase({
    organizationModelAccessRepository: mockAccessRepo,
    organizationRepository: mockOrgRepo,
    aiModelRepository: mockModelRepo,
    onModelAccessChanged: (orgId) => {
      invalidatedOrgId = orgId;
    },
  });

  // 1. Missing inputs
  await assert.rejects(
    async () => usecase.execute({ organizationId: "", aiModelId: "model-chat-1" }),
    { statusCode: 400, errorCode: "ORGANIZATION_ID_REQUIRED" },
  );

  // 2. Organization not found
  await assert.rejects(
    async () => usecase.execute({ organizationId: "nonexistent", aiModelId: "model-chat-1" }),
    { statusCode: 404, errorCode: "ORGANIZATION_NOT_FOUND" },
  );

  // 3. Model not found
  await assert.rejects(
    async () => usecase.execute({ organizationId: "org-1", aiModelId: "nonexistent" }),
    { statusCode: 404, errorCode: "AI_MODEL_NOT_FOUND" },
  );

  // 4. Non-chat model rejected
  await assert.rejects(
    async () => usecase.execute({ organizationId: "org-1", aiModelId: "model-embed-1" }),
    { statusCode: 400, errorCode: "INVALID_MODEL_CAPABILITY" },
  );

  // 5. Successful assignment
  const result = await usecase.execute({ organizationId: "org-1", aiModelId: "model-chat-1" });
  assert.equal(result.organizationId, "org-1");
  assert.equal(result.aiModelId, "model-chat-1");
  assert.equal(invalidatedOrgId, "org-1");

  // 6. Idempotent re-assignment
  const result2 = await usecase.execute({ organizationId: "org-1", aiModelId: "model-chat-1" });
  assert.equal(result2.id, "acc-1");
});

test("RemoveModelAccessUseCase deletes assigned access relation and triggers cache invalidation", async () => {
  let invalidatedOrgId = null;
  let deletedKey = null;

  const mockAccessRepo = {
    findOne: async (orgId, modelId) =>
      orgId === "org-1" && modelId === "model-chat-1" ? { id: "acc-1" } : null,
    delete: async (orgId, modelId) => {
      deletedKey = `${orgId}:${modelId}`;
    },
  };

  const usecase = new RemoveModelAccessUseCase({
    organizationModelAccessRepository: mockAccessRepo,
    onModelAccessChanged: (orgId) => {
      invalidatedOrgId = orgId;
    },
  });

  // 1. Missing inputs
  await assert.rejects(
    async () => usecase.execute({ organizationId: "", aiModelId: "model-chat-1" }),
    { statusCode: 400, errorCode: "ORGANIZATION_ID_REQUIRED" },
  );

  // 2. Successful removal
  await usecase.execute({ organizationId: "org-1", aiModelId: "model-chat-1" });
  assert.equal(deletedKey, "org-1:model-chat-1");
  assert.equal(invalidatedOrgId, "org-1");
});

test("UpdateAgentUseCase enforces organization model access and persists new model", async () => {
  const mockAgent = {
    id: "agent-1",
    projectId: "proj-1",
    aiModelId: "model-old",
    provider: "openai",
    model: "gpt-4",
    name: "Support Bot",
    update: function (data) {
      if (data.aiModelId) this.aiModelId = data.aiModelId;
      if (data.provider) this.provider = data.provider;
      if (data.model) this.model = data.model;
    },
  };

  const mockAgentRepo = {
    findById: async (id) => (id === "agent-1" ? mockAgent : null),
    update: async (agent) => agent,
  };

  const mockProjectRepo = {
    findById: async (id) => (id === "proj-1" ? { id: "proj-1", organizationId: "org-1" } : null),
  };

  const mockAccessRepo = {
    findOne: async (orgId, modelId) => {
      if (orgId === "org-1" && modelId === "model-assigned") {
        return {
          id: "acc-1",
          aiModel: {
            id: "model-assigned",
            status: "ACTIVE",
            capability: "CHAT",
            provider: "ollama",
            model: "qwen3:8b",
          },
        };
      }
      return null;
    },
  };

  const mockCheckProjectAccessUseCase = {
    execute: async () => true,
  };

  const usecase = new UpdateAgentUseCase({
    agentRepository: mockAgentRepo,
    projectRepository: mockProjectRepo,
    checkProjectAccessUseCase: mockCheckProjectAccessUseCase,
    organizationModelAccessRepository: mockAccessRepo,
  });

  // 1. Trying to update to an unassigned model is strictly rejected
  await assert.rejects(
    async () =>
      usecase.execute({
        userId: "user-1",
        agentId: "agent-1",
        data: { aiModelId: "model-unassigned" },
      }),
    { statusCode: 403, errorCode: "MODEL_ACCESS_DENIED" },
  );

  // 2. Updating to an assigned model succeeds and updates agent fields
  const updated = await usecase.execute({
    userId: "user-1",
    agentId: "agent-1",
    data: { aiModelId: "model-assigned" },
  });
  assert.equal(updated.aiModelId, "model-assigned");
  assert.equal(updated.provider, "ollama");
  assert.equal(updated.model, "qwen3:8b");
});

test("ConversationService.validateAgentModelAccess blocks unassigned models with HTTP 403 and caches assigned models", async () => {
  let findOneCalls = 0;
  const mockAccessRepo = {
    findOne: async (orgId, modelId) => {
      findOneCalls++;
      if (orgId === "org-1" && modelId === "model-allowed") {
        return {
          id: "acc-1",
          aiModel: {
            id: "model-allowed",
            status: "ACTIVE",
            provider: "ollama",
            model: "qwen3:8b",
          },
        };
      }
      return null;
    },
    findByOrganizationId: async (orgId) => {
      if (orgId === "org-1") {
        return [{ aiModel: { id: "model-allowed", provider: "ollama", model: "qwen3:8b" } }];
      }
      return [];
    },
  };

  const service = new ConversationService({
    conversationRepository: {},
    messageRepository: {},
    agentRepository: {},
    projectRepository: {},
    aiProviderFactory: {},
    organizationModelAccessRepository: mockAccessRepo,
  });

  const agentAllowed = {
    id: "agent-1",
    aiModelId: "model-allowed",
    provider: "ollama",
    model: "qwen3:8b",
    project: {
      organizationId: "org-1",
    },
  };

  const agentDenied = {
    id: "agent-2",
    aiModelId: "model-forbidden",
    provider: "openai",
    model: "nemotron",
    project: {
      organizationId: "org-1",
    },
  };

  // 1. Access to unassigned model throws HTTP 403 MODEL_ACCESS_DENIED
  await assert.rejects(
    async () => service.validateAgentModelAccess(agentDenied),
    { statusCode: 403, errorCode: "MODEL_ACCESS_DENIED" },
  );
  assert.equal(findOneCalls, 1);

  // 2. Access to assigned model succeeds (increments to 2)
  await service.validateAgentModelAccess(agentAllowed);
  assert.equal(findOneCalls, 2);

  // 3. Second call uses cache (findOneCalls remains 2)
  await service.validateAgentModelAccess(agentAllowed);
  assert.equal(findOneCalls, 2);

  // 4. Cache invalidation works (increments to 3)
  service.invalidateModelAccessCache("org-1");
  await service.validateAgentModelAccess(agentAllowed);
  assert.equal(findOneCalls, 3);
});
