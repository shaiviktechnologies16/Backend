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
      if (
        sql.includes("SELECT id FROM ai_models") ||
        sql.includes("SELECT id, status FROM ai_models")
      ) {
        return [{ id: "model-id", status: "ACTIVE" }];
      }

      if (sql.includes("WHERE status = 'ACTIVE' AND")) {
        return [
          {
            id: "model-qwen-123",
            provider: "ollama",
            model: "qwen3:8b",
            display_name: "Qwen 3 8B",
            capability: "CHAT",
            status: "ACTIVE",
          },
          {
            id: "model-qwen25vl-456",
            provider: "ollama",
            model: "qwen2.5vl:7b",
            display_name: "Qwen 2.5 VL 7B",
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

  const models = await service.getEntitledModelsForPlan("STARTER");

  assert.strictEqual(models.length, 2);
  assert.strictEqual(models[0].model, "qwen3:8b");
  assert.strictEqual(models[1].model, "qwen2.5vl:7b");
});

test("OrganizationModelEntitlementService correctly resolves BUSINESS and PREMIUM plan models", async () => {
  const mockDataSource = {
    async query(sql) {
      if (
        sql.includes("SELECT id FROM ai_models") ||
        sql.includes("SELECT id, status FROM ai_models")
      ) {
        return [{ id: "model-id", status: "ACTIVE" }];
      }

      if (sql.includes("WHERE status = 'ACTIVE'")) {
        return [
          { id: "m1", model: "qwen3:8b", status: "ACTIVE" },
          { id: "m2", model: "qwen2.5vl:7b", status: "ACTIVE" },
          { id: "m3", model: "gpt-4o-mini", status: "ACTIVE" },
          { id: "m4", model: "nomic-embed-text:latest", status: "ACTIVE" },
        ];
      }

      return [];
    },
  };

  const service = new OrganizationModelEntitlementService({
    dataSource: mockDataSource,
  });

  const businessModels = await service.getEntitledModelsForPlan("BUSINESS");
  assert.strictEqual(businessModels.length, 4);

  const premiumModels = await service.getEntitledModelsForPlan("PREMIUM");
  assert.strictEqual(premiumModels.length, 4);
});

test("OrganizationModelEntitlementService syncOrganizationModelEntitlements runs idempotently for FREE plan", async () => {
  const inserted = [];
  const deleted = [];
  const mockDataSource = {
    async query(sql, params) {
      if (
        sql.includes("SELECT id FROM ai_models") ||
        sql.includes("SELECT id, status FROM ai_models")
      ) {
        return [{ id: "model-qwen-123", status: "ACTIVE" }];
      }

      if (sql.includes("WHERE status = 'ACTIVE' AND")) {
        return [
          {
            id: "model-qwen-123",
            provider: "ollama",
            model: "qwen3:8b",
            display_name: "Qwen 3 8B",
            capability: "CHAT",
            status: "ACTIVE",
          },
        ];
      }

      if (sql.includes("INSERT INTO organization_model_access")) {
        inserted.push(params);
        return [];
      }

      if (sql.includes("DELETE FROM organization_model_access")) {
        deleted.push(params);
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
  assert.strictEqual(deleted.length, 1);
  assert.strictEqual(deleted[0][0], "org-uuid-123");
});

test("OrganizationModelEntitlementService correctly resolves custom plan code S-001 to STARTER models", async () => {
  const mockDataSource = {
    async query(sql, params) {
      if (sql.includes("SELECT id, code, slug, name FROM plans")) {
        return [
          {
            id: "plan-starter-id",
            code: "S-001",
            slug: "starter",
            name: "Starter Plan",
          },
        ];
      }

      if (
        sql.includes("SELECT id FROM ai_models") ||
        sql.includes("SELECT id, status FROM ai_models")
      ) {
        return [{ id: "model-id", status: "ACTIVE" }];
      }

      if (sql.includes("WHERE status = 'ACTIVE' AND")) {
        return [
          {
            id: "model-qwen-123",
            provider: "ollama",
            model: "qwen3:8b",
            display_name: "Qwen 3 8B",
            capability: "CHAT",
            status: "ACTIVE",
          },
          {
            id: "model-qwen25vl-456",
            provider: "ollama",
            model: "qwen2.5vl:7b",
            display_name: "Qwen 2.5 VL 7B",
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

  const models = await service.getEntitledModelsForPlan("S-001");

  assert.strictEqual(models.length, 2);
  assert.strictEqual(models[0].model, "qwen3:8b");
  assert.strictEqual(models[1].model, "qwen2.5vl:7b");
});
