import { AppError } from "../../../../../common/errors/AppError.js";

export class OrganizationModelEntitlementService {
  constructor({ dataSource }) {
    this.dataSource = dataSource;
  }

  /**
   * Helper to ensure canonical default models exist in `ai_models` table.
   */
  async ensureDefaultModelsExist(runner = this.dataSource) {
    const defaultModels = [
      {
        provider: "ollama",
        model: "qwen3:8b",
        display_name: "Qwen3-8B",
        capability: "CHAT",
        description: "Standard efficient open-weight LLM for AI agents",
        status: "ACTIVE",
      },
      {
        provider: "ollama",
        model: "nomic-embed-text:latest",
        display_name: "Nomic Embed Text",
        capability: "EMBEDDING",
        description:
          "High performance text embedding model for RAG and Knowledge Base",
        status: "ACTIVE",
      },
    ];

    for (const item of defaultModels) {
      const existing = await runner.query(
        "SELECT id, status FROM ai_models WHERE model = $1 OR model ILIKE $2 LIMIT 1",
        [item.model, `%${item.model}%`],
      );

      if (existing.length === 0) {
        await runner.query(
          `INSERT INTO ai_models (provider, model, display_name, capability, description, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [
            item.provider,
            item.model,
            item.display_name,
            item.capability,
            item.description,
            item.status,
          ],
        );
      } else if (existing[0].status !== "ACTIVE") {
        await runner.query(
          "UPDATE ai_models SET status = 'ACTIVE' WHERE id = $1",
          [existing[0].id],
        );
      }
    }
  }

  /**
   * Resolve entitled AI models for a specific plan code.
   */
  async getEntitledModelsForPlan(planCode, runner = this.dataSource) {
    await this.ensureDefaultModelsExist(runner);

    const normalizedCode = (planCode || "").toUpperCase().trim();

    if (normalizedCode === "FREE") {
      let models = await runner.query(
        `SELECT id, provider, model, display_name, capability, status
         FROM ai_models
         WHERE status = 'ACTIVE' AND (
           model = 'qwen3:8b' OR model ILIKE '%qwen3%' OR display_name ILIKE '%qwen 3%' OR display_name ILIKE '%qwen3%'
         )
         ORDER BY (CASE WHEN model = 'qwen3:8b' THEN 0 ELSE 1 END) ASC
         LIMIT 1`,
      );

      if (models.length === 0) {
        models = await runner.query(
          `SELECT id, provider, model, display_name, capability, status
           FROM ai_models
           WHERE status = 'ACTIVE' AND (model ILIKE '%qwen%' OR display_name ILIKE '%qwen%')
           ORDER BY created_at ASC LIMIT 1`,
        );
      }

      if (models.length === 0) {
        models = await runner.query(
          `SELECT id, provider, model, display_name, capability, status
           FROM ai_models
           WHERE status = 'ACTIVE' AND capability = 'CHAT'
           ORDER BY created_at ASC LIMIT 1`,
        );
      }

      if (models.length === 0) {
        models = await runner.query(
          `SELECT id, provider, model, display_name, capability, status
           FROM ai_models
           WHERE status = 'ACTIVE'
           ORDER BY created_at ASC LIMIT 1`,
        );
      }

      return models;
    }

    if (normalizedCode === "STARTER") {
      let models = await runner.query(
        `SELECT id, provider, model, display_name, capability, status
         FROM ai_models
         WHERE status = 'ACTIVE' AND (
           model = 'qwen3:8b' OR model ILIKE '%qwen%' OR display_name ILIKE '%qwen%'
           OR model = 'nomic-embed-text:latest' OR model ILIKE '%nomic%' OR display_name ILIKE '%nomic%'
         )`,
      );

      if (models.length === 0) {
        models = await runner.query(
          `SELECT id, provider, model, display_name, capability, status
           FROM ai_models
           WHERE status = 'ACTIVE'
           LIMIT 2`,
        );
      }

      return models;
    }

    if (normalizedCode === "BUSINESS" || normalizedCode === "PREMIUM") {
      return runner.query(
        `SELECT id, provider, model, display_name, capability, status
         FROM ai_models
         WHERE status = 'ACTIVE'`,
      );
    }

    // Default fallback for custom or unknown active plans: return active models
    return runner.query(
      `SELECT id, provider, model, display_name, capability, status
       FROM ai_models
       WHERE status = 'ACTIVE'`,
    );
  }

  /**
   * Synchronize organization model access records based on active subscription plan.
   *
   * @param {Object} params
   * @param {string} params.organizationId
   * @param {string} [params.planCode]
   * @param {string} [params.planId]
   * @param {Object} [params.runner] - Optional database query runner / entity manager
   */
  async syncOrganizationModelEntitlements({
    organizationId,
    planCode = null,
    planId = null,
    runner = null,
  }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required for model entitlement sync.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    const db = runner || this.dataSource;

    let targetPlanCode = planCode;

    if (!targetPlanCode && planId) {
      const planRes = await db.query(
        "SELECT code FROM plans WHERE id = $1 LIMIT 1",
        [planId],
      );
      if (planRes[0]?.code) {
        targetPlanCode = planRes[0].code;
      }
    }

    if (!targetPlanCode) {
      const orgPlanRes = await db.query(
        `SELECT p.code
         FROM organizations o
         JOIN plans p ON p.id = o.plan_id
         WHERE o.id = $1 LIMIT 1`,
        [organizationId],
      );
      targetPlanCode = orgPlanRes[0]?.code || "FREE";
    }

    const entitledModels = await this.getEntitledModelsForPlan(
      targetPlanCode,
      db,
    );

    const entitledModelIds = entitledModels.map((m) => m.id);

    if (entitledModelIds.length > 0) {
      for (const modelId of entitledModelIds) {
        await db.query(
          `INSERT INTO organization_model_access (organization_id, ai_model_id)
           VALUES ($1, $2)
           ON CONFLICT (organization_id, ai_model_id) DO NOTHING`,
          [organizationId, modelId],
        );
      }
    }

    // Handle downgrades: remove model access rows no longer permitted under the plan
    if (entitledModelIds.length > 0) {
      await db.query(
        `DELETE FROM organization_model_access
         WHERE organization_id = $1
           AND ai_model_id NOT IN (${entitledModelIds.map((_, i) => `$${i + 2}`).join(", ")})`,
        [organizationId, ...entitledModelIds],
      );
    } else {
      await db.query(
        `DELETE FROM organization_model_access WHERE organization_id = $1`,
        [organizationId],
      );
    }

    return {
      organizationId,
      planCode: targetPlanCode,
      assignedCount: entitledModels.length,
      assignedModels: entitledModels.map((m) => ({
        id: m.id,
        model: m.model,
        displayName: m.display_name,
        capability: m.capability,
      })),
    };
  }
}
