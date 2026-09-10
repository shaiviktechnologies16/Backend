export class SeedDefaultPlansAndFeatures1730000410000 {
  async up(queryRunner) {
    const plansData = [
      {
        name: "Free",
        code: "FREE",
        slug: "free",
        description: "Getting started with AI",
        price_monthly: 0,
        price_yearly: 0,
        currency: "INR",
        display_order: 1,
        is_public: true,
        is_default: true,
        is_archived: false,
        trial_enabled: false,
        trial_days: 0,
        limits: {
          max_projects: 1,
          max_agents: 2,
          max_knowledge_bases: 1,
          max_knowledge_documents: 50,
          monthly_ai_credits: 1000,
          max_team_members: 1,
          max_whatsapp_connections: 0,
          voice_ai_minutes: 0,
          requests_per_day: 100,
          requests_per_month: 3000,
          tokens_per_day: 50000,
          tokens_per_month: 1500000,
          conversations_per_day: 20,
          conversations_per_month: 600,
          unique_visitors_per_day: 50,
          unique_visitors_per_month: 1000,
          messages_per_visitor_per_day: 10,
          messages_per_visitor_per_month: 200,
        },
        features: {
          AI_CHAT: true,
          AI_AGENTS: true,
          KNOWLEDGE_BASE: true,
          RAG: true,
          AUTOMATION: true,
          WHATSAPP: false,
          VOICE_AI: false,
          ANALYTICS: true,
          API_ACCESS: false,
          TEAM_COLLABORATION: false,
          PRIORITY_SUPPORT: false,
          ADVANCED_SECURITY: false,
        },
      },
      {
        name: "Starter",
        code: "STARTER",
        slug: "starter",
        description: "Small businesses starting with AI",
        price_monthly: 19,
        price_yearly: 190,
        currency: "INR",
        display_order: 2,
        is_public: true,
        is_default: false,
        is_archived: false,
        trial_enabled: true,
        trial_days: 14,
        limits: {
          max_projects: 3,
          max_agents: 10,
          max_knowledge_bases: 5,
          max_knowledge_documents: 500,
          monthly_ai_credits: 10000,
          max_team_members: 5,
          max_whatsapp_connections: 1,
          voice_ai_minutes: 100,
          requests_per_day: 1000,
          requests_per_month: 30000,
          tokens_per_day: 500000,
          tokens_per_month: 15000000,
          conversations_per_day: 200,
          conversations_per_month: 6000,
          unique_visitors_per_day: 500,
          unique_visitors_per_month: 10000,
          messages_per_visitor_per_day: 30,
          messages_per_visitor_per_month: 600,
        },
        features: {
          AI_CHAT: true,
          AI_AGENTS: true,
          KNOWLEDGE_BASE: true,
          RAG: true,
          AUTOMATION: true,
          WHATSAPP: true,
          VOICE_AI: true,
          ANALYTICS: true,
          API_ACCESS: false,
          TEAM_COLLABORATION: true,
          PRIORITY_SUPPORT: false,
          ADVANCED_SECURITY: false,
        },
      },
      {
        name: "Business",
        code: "BUSINESS",
        slug: "business",
        description: "Growing businesses and teams",
        price_monthly: 49,
        price_yearly: 490,
        currency: "INR",
        display_order: 3,
        is_public: true,
        is_default: false,
        is_archived: false,
        trial_enabled: true,
        trial_days: 14,
        limits: {
          max_projects: 10,
          max_agents: 50,
          max_knowledge_bases: 20,
          max_knowledge_documents: 5000,
          monthly_ai_credits: 50000,
          max_team_members: 20,
          max_whatsapp_connections: 5,
          voice_ai_minutes: 1000,
          requests_per_day: 5000,
          requests_per_month: 150000,
          tokens_per_day: 2000000,
          tokens_per_month: 60000000,
          conversations_per_day: 1000,
          conversations_per_month: 30000,
          unique_visitors_per_day: 5000,
          unique_visitors_per_month: 100000,
          messages_per_visitor_per_day: 50,
          messages_per_visitor_per_month: 1500,
        },
        features: {
          AI_CHAT: true,
          AI_AGENTS: true,
          KNOWLEDGE_BASE: true,
          RAG: true,
          AUTOMATION: true,
          WHATSAPP: true,
          VOICE_AI: true,
          ANALYTICS: true,
          API_ACCESS: true,
          TEAM_COLLABORATION: true,
          PRIORITY_SUPPORT: true,
          ADVANCED_SECURITY: false,
        },
      },
      {
        name: "Premium",
        code: "PREMIUM",
        slug: "premium",
        description: "High-volume businesses and advanced AI operations",
        price_monthly: 149,
        price_yearly: 1490,
        currency: "INR",
        display_order: 4,
        is_public: true,
        is_default: false,
        is_archived: false,
        trial_enabled: true,
        trial_days: 14,
        limits: {
          max_projects: 50,
          max_agents: 250,
          max_knowledge_bases: 100,
          max_knowledge_documents: 25000,
          monthly_ai_credits: 250000,
          max_team_members: 100,
          max_whatsapp_connections: 25,
          voice_ai_minutes: 5000,
          requests_per_day: 25000,
          requests_per_month: 750000,
          tokens_per_day: 10000000,
          tokens_per_month: 300000000,
          conversations_per_day: 5000,
          conversations_per_month: 150000,
          unique_visitors_per_day: 25000,
          unique_visitors_per_month: 500000,
          messages_per_visitor_per_day: 100,
          messages_per_visitor_per_month: 3000,
        },
        features: {
          AI_CHAT: true,
          AI_AGENTS: true,
          KNOWLEDGE_BASE: true,
          RAG: true,
          AUTOMATION: true,
          WHATSAPP: true,
          VOICE_AI: true,
          ANALYTICS: true,
          API_ACCESS: true,
          TEAM_COLLABORATION: true,
          PRIORITY_SUPPORT: true,
          ADVANCED_SECURITY: true,
        },
      },
    ];

    for (const plan of plansData) {
      const existing = await queryRunner.query(
        "SELECT id FROM plans WHERE code = $1 OR slug = $2 LIMIT 1",
        [plan.code, plan.slug],
      );

      let planId = existing[0]?.id;

      if (!planId) {
        const insertRes = await queryRunner.query(
          `
          INSERT INTO plans (
            name, code, slug, description, price_monthly, price_yearly,
            currency, display_order, is_public, is_default, is_archived,
            trial_enabled, trial_days, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
          RETURNING id
        `,
          [
            plan.name,
            plan.code,
            plan.slug,
            plan.description,
            plan.price_monthly,
            plan.price_yearly,
            plan.currency,
            plan.display_order,
            plan.is_public,
            plan.is_default,
            plan.is_archived,
            plan.trial_enabled,
            plan.trial_days,
          ],
        );
        planId = insertRes[0].id;
      } else {
        await queryRunner.query(
          `
          UPDATE plans SET
            name = $1, slug = $2, description = $3, price_monthly = $4,
            price_yearly = $5, currency = $6, display_order = $7,
            is_public = $8, is_default = $9, is_archived = $10,
            trial_enabled = $11, trial_days = $12
          WHERE id = $13
        `,
          [
            plan.name,
            plan.slug,
            plan.description,
            plan.price_monthly,
            plan.price_yearly,
            plan.currency,
            plan.display_order,
            plan.is_public,
            plan.is_default,
            plan.is_archived,
            plan.trial_enabled,
            plan.trial_days,
            planId,
          ],
        );
      }

      // Upsert limits
      const limitExisting = await queryRunner.query(
        "SELECT id FROM plan_usage_limits WHERE plan_id = $1 LIMIT 1",
        [planId],
      );

      if (limitExisting.length === 0) {
        await queryRunner.query(
          `
          INSERT INTO plan_usage_limits (
            plan_id, max_projects, max_agents, max_knowledge_bases,
            max_knowledge_documents, monthly_ai_credits, max_team_members,
            max_whatsapp_connections, voice_ai_minutes, requests_per_day,
            requests_per_month, tokens_per_day, tokens_per_month,
            conversations_per_day, conversations_per_month,
            unique_visitors_per_day, unique_visitors_per_month,
            messages_per_visitor_per_day, messages_per_visitor_per_month
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `,
          [
            planId,
            plan.limits.max_projects,
            plan.limits.max_agents,
            plan.limits.max_knowledge_bases,
            plan.limits.max_knowledge_documents,
            plan.limits.monthly_ai_credits,
            plan.limits.max_team_members,
            plan.limits.max_whatsapp_connections,
            plan.limits.voice_ai_minutes,
            plan.limits.requests_per_day,
            plan.limits.requests_per_month,
            plan.limits.tokens_per_day,
            plan.limits.tokens_per_month,
            plan.limits.conversations_per_day,
            plan.limits.conversations_per_month,
            plan.limits.unique_visitors_per_day,
            plan.limits.unique_visitors_per_month,
            plan.limits.messages_per_visitor_per_day,
            plan.limits.messages_per_visitor_per_month,
          ],
        );
      } else {
        await queryRunner.query(
          `
          UPDATE plan_usage_limits SET
            max_projects = $1, max_agents = $2, max_knowledge_bases = $3,
            max_knowledge_documents = $4, monthly_ai_credits = $5,
            max_team_members = $6, max_whatsapp_connections = $7,
            voice_ai_minutes = $8, requests_per_day = $9,
            requests_per_month = $10, tokens_per_day = $11,
            tokens_per_month = $12, conversations_per_day = $13,
            conversations_per_month = $14, unique_visitors_per_day = $15,
            unique_visitors_per_month = $16, messages_per_visitor_per_day = $17,
            messages_per_visitor_per_month = $18
          WHERE plan_id = $19
        `,
          [
            plan.limits.max_projects,
            plan.limits.max_agents,
            plan.limits.max_knowledge_bases,
            plan.limits.max_knowledge_documents,
            plan.limits.monthly_ai_credits,
            plan.limits.max_team_members,
            plan.limits.max_whatsapp_connections,
            plan.limits.voice_ai_minutes,
            plan.limits.requests_per_day,
            plan.limits.requests_per_month,
            plan.limits.tokens_per_day,
            plan.limits.tokens_per_month,
            plan.limits.conversations_per_day,
            plan.limits.conversations_per_month,
            plan.limits.unique_visitors_per_day,
            plan.limits.unique_visitors_per_month,
            plan.limits.messages_per_visitor_per_day,
            plan.limits.messages_per_visitor_per_month,
            planId,
          ],
        );
      }

      // Upsert features
      for (const [featureKey, isEnabled] of Object.entries(plan.features)) {
        const featExisting = await queryRunner.query(
          "SELECT id FROM plan_features WHERE plan_id = $1 AND feature_key = $2 LIMIT 1",
          [planId, featureKey],
        );

        if (featExisting.length === 0) {
          await queryRunner.query(
            "INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES ($1, $2, $3)",
            [planId, featureKey, isEnabled],
          );
        } else {
          await queryRunner.query(
            "UPDATE plan_features SET is_enabled = $1 WHERE plan_id = $2 AND feature_key = $3",
            [isEnabled, planId, featureKey],
          );
        }
      }
    }

    // Backfill subscriptions for existing organizations that don't have one
    const freePlanRes = await queryRunner.query(
      "SELECT id FROM plans WHERE code = 'FREE' LIMIT 1",
    );
    const freePlanId = freePlanRes[0]?.id;

    if (freePlanId) {
      await queryRunner.query(`
        INSERT INTO subscriptions (organization_id, plan_id, status, billing_interval)
        SELECT o.id, COALESCE(o.plan_id, '${freePlanId}'), 'ACTIVE', 'MONTHLY'
        FROM organizations o
        LEFT JOIN subscriptions s ON s.organization_id = o.id
        WHERE s.id IS NULL
      `);

      // Set plan_id on organizations where null
      await queryRunner.query(`
        UPDATE organizations SET plan_id = '${freePlanId}' WHERE plan_id IS NULL
      `);
    }
  }

  async down(queryRunner) {
    // Reversible if needed
  }
}
