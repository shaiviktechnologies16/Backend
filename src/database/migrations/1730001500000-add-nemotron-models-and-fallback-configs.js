export class AddNemotronModelsAndFallbackConfigs1730001500000 {
  name = "AddNemotronModelsAndFallbackConfigs1730001500000";

  async up(queryRunner) {
    // 1. Ensure the four Nemotron models exist in ai_models table
    const models = [
      {
        provider: "openai",
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        display_name: "Nemotron 3 Super 120B",
        capability: "CHAT",
        description: "Primary high-capacity conversational and reasoning model by NVIDIA via OpenRouter",
        status: "ACTIVE",
      },
      {
        provider: "openai",
        model: "nvidia/nemotron-3.5-super-vl:free",
        display_name: "Nemotron 3.5 Super VL",
        capability: "CHAT",
        description: "First fallback multimodal vision-language model with tool calling by NVIDIA via OpenRouter",
        status: "ACTIVE",
      },
      {
        provider: "openai",
        model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        display_name: "Nemotron 3 Nano Omni Reasoning",
        capability: "CHAT",
        description: "Second fallback fast reasoning model by NVIDIA via OpenRouter",
        status: "ACTIVE",
      },
      {
        provider: "openai",
        model: "nvidia/nemotron-3-embed-1b:free",
        display_name: "Nemotron 3 Embed 1B",
        capability: "EMBEDDING",
        description: "High-performance text embedding model by NVIDIA for Knowledge Base vector search",
        status: "ACTIVE",
      },
    ];

    for (const item of models) {
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
          "UPDATE ai_models SET status = 'ACTIVE', display_name = $1, capability = $2, description = $3 WHERE id = $4",
          [item.display_name, item.capability, item.description, existing[0].id],
        );
      }
    }

    // 2. Grant access to all existing organizations for the CHAT models
    await queryRunner.query(`
      INSERT INTO organization_model_access (organization_id, ai_model_id)
      SELECT o.id, m.id
      FROM organizations o
      CROSS JOIN ai_models m
      WHERE m.model IN (
        'nvidia/nemotron-3-super-120b-a12b:free',
        'nvidia/nemotron-3.5-super-vl:free',
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
      )
      ON CONFLICT DO NOTHING;
    `);

    // 3. Upsert failover platform configuration entries
    const configs = [
      {
        key: "OPENAI_MODEL",
        value: "nvidia/nemotron-3-super-120b-a12b:free",
        description: "Primary LLM model identifier for OpenRouter OpenAI-compatible provider",
        isSecret: false,
      },
      {
        key: "OPENAI_FALLBACK_MODELS",
        value: "nvidia/nemotron-3.5-super-vl:free,nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        description: "Comma-separated list of fallback model identifiers in order of priority",
        isSecret: false,
      },
      {
        key: "OPENROUTER_SITE_URL",
        value: "https://shaiviktechnologies.in",
        description: "Site URL header for OpenRouter app rankings and analytics",
        isSecret: false,
      },
      {
        key: "OPENROUTER_APP_NAME",
        value: "Shaivik AI SaaS",
        description: "Application name header for OpenRouter rankings and dashboard analytics",
        isSecret: false,
      },
    ];

    for (const conf of configs) {
      const existing = await queryRunner.query(
        "SELECT id FROM platform_configs WHERE config_key = $1 LIMIT 1",
        [conf.key],
      );

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO platform_configs (config_key, config_value, description, is_secret)
           VALUES ($1, $2, $3, $4)`,
          [conf.key, conf.value, conf.description, conf.isSecret],
        );
      } else {
        await queryRunner.query(
          "UPDATE platform_configs SET config_value = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
          [conf.value, conf.description, existing[0].id],
        );
      }
    }
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DELETE FROM platform_configs
      WHERE config_key IN ('OPENAI_FALLBACK_MODELS', 'OPENROUTER_APP_NAME');
    `);

    await queryRunner.query(`
      UPDATE ai_models
      SET status = 'INACTIVE'
      WHERE model IN (
        'nvidia/nemotron-3-super-120b-a12b:free',
        'nvidia/nemotron-3.5-super-vl:free',
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        'nvidia/nemotron-3-embed-1b:free'
      );
    `);
  }
}

