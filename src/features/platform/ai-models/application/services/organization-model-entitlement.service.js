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
        display_name: "Qwen 3 8B",
        capability: "CHAT",
        description: "Standard efficient open-weight LLM for AI agents",
        status: "ACTIVE",
      },
      {
        provider: "ollama",
        model: "qwen2.5vl:7b",
        display_name: "Qwen 2.5 VL 7B",
        capability: "CHAT",
        description:
          "Multimodal vision-language open-weight model for AI agents",
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
   * Resolve entitled AI models for a specific plan code, ID, or slug.
   */
  async getEntitledModelsForPlan(planCodeOrId, runner = this.dataSource) {
    await this.ensureDefaultModelsExist(runner);

    let planCode = (planCodeOrId || "").toUpperCase().trim();
    let planSlug = (planCodeOrId || "").toLowerCase().trim();
    let planName = (planCodeOrId || "").toUpperCase().trim();

    if (planCodeOrId) {
      const planRes = await runner.query(
        `SELECT id, code, slug, name FROM plans WHERE id::text = $1 OR code ILIKE $1 OR slug ILIKE $1 OR name ILIKE $1 LIMIT 1`,
        [planCodeOrId],
      );

      if (planRes[0]) {
        planCode = (planRes[0].code || "").toUpperCase().trim();
        planSlug = (planRes[0].slug || "").toLowerCase().trim();
        planName = (planRes[0].name || "").toUpperCase().trim();
      }
    }

    const isFree =
      planCode === "FREE" ||
      planCode.startsWith("F-") ||
      planSlug === "free" ||
      planName.includes("FREE");

    const isStarter =
      planCode === "STARTER" ||
      planCode.startsWith("S-") ||
      planSlug === "starter" ||
      planName.includes("STARTER");

    const isBusiness =
      planCode === "BUSINESS" ||
      planCode.startsWith("B-") ||
      planSlug === "business" ||
      planName.includes("BUSINESS");

    const isPremium =
      planCode === "PREMIUM" ||
      planCode.startsWith("P-") ||
      planSlug === "premium" ||
      planName.includes("PREMIUM");

    if (isFree) {
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

    if (isStarter) {
      let models = await runner.query(
        `SELECT id, provider, model, display_name, capability, status
         FROM ai_models
         WHERE status = 'ACTIVE' AND (
           model = 'qwen3:8b' OR model ILIKE '%qwen3%' OR display_name ILIKE '%qwen 3%' OR display_name ILIKE '%qwen3%'
           OR model = 'qwen2.5vl:7b' OR model ILIKE '%qwen2.5vl%' OR model ILIKE '%qwen2.5%' OR display_name ILIKE '%qwen 2.5%' OR display_name ILIKE '%qwen2.5%'
         )
         ORDER BY (CASE WHEN model = 'qwen3:8b' THEN 0 ELSE 1 END) ASC`,
      );

      if (models.length === 0) {
        models = await runner.query(
          `SELECT id, provider, model, display_name, capability, status
           FROM ai_models
           WHERE status = 'ACTIVE' AND capability = 'CHAT'
           LIMIT 2`,
        );
      }

      return models;
    }

    if (isBusiness || isPremium) {
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

    let targetPlanCode = planCode || planId;

    if (!targetPlanCode) {
      const subPlanRes = await db.query(
        `SELECT s.plan_id, p.code, p.slug, p.name
         FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         WHERE s.organization_id = $1 AND s.status = 'ACTIVE'
         ORDER BY s.updated_at DESC LIMIT 1`,
        [organizationId],
      );

      if (subPlanRes[0]) {
        targetPlanCode = subPlanRes[0].plan_id || subPlanRes[0].code;
      }
    }

    if (!targetPlanCode) {
      const orgPlanRes = await db.query(
        `SELECT o.plan_id, p.code, p.slug, p.name
         FROM organizations o
         LEFT JOIN plans p ON p.id = o.plan_id
         WHERE o.id = $1 LIMIT 1`,
        [organizationId],
      );

      if (orgPlanRes[0]) {
        targetPlanCode = orgPlanRes[0].plan_id || orgPlanRes[0].code || "FREE";
      }
    }

    if (!targetPlanCode) {
      targetPlanCode = "FREE";
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
