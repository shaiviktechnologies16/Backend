import { test } from "node:test";
import assert from "node:assert";
import { OrganizationModelEntitlementService } from "./application/services/organization-model-entitlement.service.js";

test("OrganizationModelEntitlementService correctly resolves FREE plan models", async () => {
  const queryLogs = [];
  const mockDataSource = {
    async query(sql, params) {
      queryLogs.push({ sql, params });

      if (sql.includes("SELECT id FROM ai_models")) {
        return [{ id: "model-qwen-123" }];
      }

      if (sql.includes("WHERE status = 'ACTIVE' AND")) {
        return [
          {
            id: "model-qwen-123",
            provider: "ollama",
            model: "qwen3:8b",
            display_name: "Qwen3-8B",
            capability: "CHAT",
            status: "ACTIVE",
          },
        ];
      }

      return [];
    },
  };

  const service = new OrganizationModelEntitlementService({
    dataSource: mockDataSource,
  });

  const models = await service.getEntitledModelsForPlan("FREE");

  assert.strictEqual(models.length, 1);
  assert.strictEqual(models[0].model, "qwen3:8b");
});

test("OrganizationModelEntitlementService correctly resolves STARTER plan models", async () => {
  const mockDataSource = {
    async query(sql) {
      if (sql.includes("SELECT id FROM ai_models")) {
        return [{ id: "model-id" }];
      }

      if (sql.includes("WHERE status = 'ACTIVE' AND")) {
        return [
          {
            id: "model-qwen-123",
            provider: "ollama",
            model: "qwen3:8b",
            display_name: "Qwen3-8B",
            capability: "CHAT",
            status: "ACTIVE",
          },
          {
            id: "model-nomic-456",
            provider: "ollama",
            model: "nomic-embed-text:latest",
            display_name: "Nomic Embed Text",
            capability: "EMBEDDING",
            status: "ACTIVE",
          },
        ];
      }

      return [];
    },
  };

  const service = new OrganizationModelEntitlementService({
    dataSource: mockDataSource,
  });

  const models = await service.getEntitledModelsForPlan("STARTER");

  assert.strictEqual(models.length, 2);
  assert.strictEqual(models[0].model, "qwen3:8b");
  assert.strictEqual(models[1].model, "nomic-embed-text:latest");
});

test("OrganizationModelEntitlementService syncOrganizationModelEntitlements runs idempotently for FREE plan", async () => {
  const inserted = [];
  const mockDataSource = {
    async query(sql, params) {
      if (sql.includes("SELECT id FROM ai_models")) {
        return [{ id: "model-qwen-123" }];
      }

      if (sql.includes("WHERE status = 'ACTIVE' AND")) {
        return [
          {
            id: "model-qwen-123",
            provider: "ollama",
            model: "qwen3:8b",
            display_name: "Qwen3-8B",
            capability: "CHAT",
            status: "ACTIVE",
          },
        ];
      }

      if (sql.includes("INSERT INTO organization_model_access")) {
        inserted.push(params);
        return [];
      }

      return [];
    },
  };

  const service = new OrganizationModelEntitlementService({
    dataSource: mockDataSource,
  });

  const result = await service.syncOrganizationModelEntitlements({
    organizationId: "org-uuid-123",
    planCode: "FREE",
  });

  assert.strictEqual(result.organizationId, "org-uuid-123");
  assert.strictEqual(result.planCode, "FREE");
  assert.strictEqual(result.assignedCount, 1);
  assert.strictEqual(inserted.length, 1);
  assert.strictEqual(inserted[0][0], "org-uuid-123");
  assert.strictEqual(inserted[0][1], "model-qwen-123");
});
