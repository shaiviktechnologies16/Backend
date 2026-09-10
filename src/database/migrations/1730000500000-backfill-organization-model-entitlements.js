export class BackfillOrganizationModelEntitlements1730000500000 {
  name = "BackfillOrganizationModelEntitlements1730000500000";

  async up(queryRunner) {
    // 1. Ensure default AI models exist in ai_models table
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
      const existing = await queryRunner.query(
        "SELECT id FROM ai_models WHERE model = $1 LIMIT 1",
        [item.model],
      );

      if (existing.length === 0) {
        await queryRunner.query(
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
      } else {
        await queryRunner.query(
          "UPDATE ai_models SET status = 'ACTIVE' WHERE id = $1",
          [existing[0].id],
        );
      }
    }

    // 2. Query all organizations with their effective plan code
    const organizations = await queryRunner.query(`
      SELECT o.id AS organization_id, UPPER(COALESCE(p.code, 'FREE')) AS plan_code
      FROM organizations o
      LEFT JOIN plans p ON p.id = o.plan_id
    `);

    // 3. For each organization, assign models according to subscription plan
    for (const org of organizations) {
      const orgId = org.organization_id;
      const planCode = org.plan_code;

      let entitledModels = [];

      if (planCode === "FREE") {
        entitledModels = await queryRunner.query(
          `SELECT id FROM ai_models WHERE status = 'ACTIVE' AND (model = 'qwen3:8b' OR model ILIKE '%qwen3%' OR display_name ILIKE '%qwen 3%' OR display_name ILIKE '%qwen3%') ORDER BY (CASE WHEN model = 'qwen3:8b' THEN 0 ELSE 1 END) ASC LIMIT 1`,
        );
      } else if (planCode === "STARTER") {
        entitledModels = await queryRunner.query(
          `SELECT id FROM ai_models WHERE status = 'ACTIVE' AND (model = 'qwen3:8b' OR model ILIKE '%qwen%' OR display_name ILIKE '%qwen%' OR model = 'nomic-embed-text:latest' OR model ILIKE '%nomic%' OR display_name ILIKE '%nomic%')`,
        );
      } else {
        // BUSINESS, PREMIUM, or custom active plans
        entitledModels = await queryRunner.query(
          `SELECT id FROM ai_models WHERE status = 'ACTIVE'`,
        );
      }

      // Fallback: If no qwen model found for Free, assign any active chat/first model
      if (entitledModels.length === 0) {
        entitledModels = await queryRunner.query(
          `SELECT id FROM ai_models WHERE status = 'ACTIVE' LIMIT 1`,
        );
      }

      for (const modelRow of entitledModels) {
        await queryRunner.query(
          `INSERT INTO organization_model_access (organization_id, ai_model_id)
           VALUES ($1, $2)
           ON CONFLICT (organization_id, ai_model_id) DO NOTHING`,
          [orgId, modelRow.id],
        );
      }
    }
  }

  async down(queryRunner) {
    // Reversible if needed
  }
}
