import fs from "fs";
import path from "path";
import { AppError } from "../../../../../common/errors/AppError.js";

export class EntitlementService {
  constructor({
    dataSource,
    planRepository,
    organizationModelEntitlementService,
  }) {
    this.dataSource = dataSource;
    this.planRepository = planRepository;
    this.organizationModelEntitlementService =
      organizationModelEntitlementService;
  }

  async getSubscriptionWithPlan(organizationId) {
    const subscriptionRes = await this.dataSource.query(
      `
      SELECT
        s.id AS subscription_id,
        s.organization_id,
        s.plan_id,
        s.status,
        s.billing_interval,
        s.current_period_start,
        s.current_period_end,
        s.trial_ends_at,
        s.canceled_at,

        p.id AS p_id,
        p.name AS p_name,
        p.code AS p_code,
        p.slug AS p_slug,
        p.description AS p_description,
        p.price_monthly AS p_price_monthly,
        p.price_yearly AS p_price_yearly,
        p.currency AS p_currency,
        p.display_order AS p_display_order,
        p.is_active AS p_is_active,
        p.is_public AS p_is_public,
        p.is_default AS p_is_default,
        p.is_archived AS p_is_archived,
        p.trial_enabled AS p_trial_enabled,
        p.trial_days AS p_trial_days

      FROM subscriptions s
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE s.organization_id = $1
      LIMIT 1
      `,
      [organizationId],
    );

    let subRow = subscriptionRes[0];

    // Fallback to org.plan_id or default FREE plan if subscription row doesn't exist yet
    if (!subRow) {
      const orgRes = await this.dataSource.query(
        "SELECT plan_id FROM organizations WHERE id = $1 LIMIT 1",
        [organizationId],
      );
      let planId = orgRes[0]?.plan_id;

      if (!planId) {
        const freePlanRes = await this.dataSource.query(
          "SELECT id FROM plans WHERE code = 'FREE' OR is_default = true LIMIT 1",
        );
        planId = freePlanRes[0]?.id;
      }

      if (planId) {
        const createdSub = await this.dataSource.query(
          `
          INSERT INTO subscriptions (organization_id, plan_id, status, billing_interval, current_period_start, current_period_end)
          VALUES ($1, $2, 'ACTIVE', 'MONTHLY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month')
          ON CONFLICT (organization_id) DO UPDATE SET plan_id = $2, current_period_end = CURRENT_TIMESTAMP + INTERVAL '1 month'
          RETURNING id, organization_id, plan_id, status, billing_interval, current_period_start, current_period_end, trial_ends_at, canceled_at
          `,
          [organizationId, planId],
        );
        return this.getSubscriptionWithPlan(organizationId);
      }
    }

    if (!subRow?.p_id) {
      throw new AppError(
        "Organization subscription or plan not found.",
        403,
        "PLAN_NOT_ASSIGNED",
      );
    }

    // If current_period_end is null for an active subscription, compute and backfill it
    if (
      subRow.status === "ACTIVE" &&
      !subRow.current_period_end &&
      subRow.subscription_id
    ) {
      let intervalSql = "1 month";
      if (subRow.billing_interval === "QUARTERLY") {
        intervalSql = "3 months";
      } else if (subRow.billing_interval === "YEARLY") {
        intervalSql = "1 year";
      }

      await this.dataSource.query(
        `UPDATE subscriptions SET current_period_start = COALESCE(current_period_start, CURRENT_TIMESTAMP), current_period_end = CURRENT_TIMESTAMP + INTERVAL '${intervalSql}', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [subRow.subscription_id],
      );

      const periodRes = await this.dataSource.query(
        "SELECT current_period_start, current_period_end FROM subscriptions WHERE id = $1 LIMIT 1",
        [subRow.subscription_id],
      );
      if (periodRes[0]) {
        subRow.current_period_start = periodRes[0].current_period_start;
        subRow.current_period_end = periodRes[0].current_period_end;
      }
    }

    // Auto-expire active subscription if current_period_end has passed
    if (
      subRow.status === "ACTIVE" &&
      subRow.current_period_end &&
      new Date(subRow.current_period_end) < new Date()
    ) {
      await this.dataSource.query(
        "UPDATE subscriptions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [subRow.subscription_id],
      );
      subRow.status = "EXPIRED";
    }

    // Fetch usage limits
    const limitsRes = await this.dataSource.query(
      "SELECT * FROM plan_usage_limits WHERE plan_id = $1 LIMIT 1",
      [subRow.p_id],
    );
    const limitsRow = limitsRes[0] ?? {};

    // Fetch features
    const featuresRes = await this.dataSource.query(
      "SELECT feature_key, is_enabled, config FROM plan_features WHERE plan_id = $1",
      [subRow.p_id],
    );
    const features = {};
    for (const f of featuresRes) {
      features[f.feature_key] = f.is_enabled;
    }

    return {
      subscription: {
        id: subRow.subscription_id,
        organizationId: subRow.organization_id,
        planId: subRow.plan_id,
        status: subRow.status,
        billingInterval: subRow.billing_interval,
        currentPeriodStart: subRow.current_period_start,
        currentPeriodEnd: subRow.current_period_end,
        trialEndsAt: subRow.trial_ends_at,
        canceledAt: subRow.canceled_at,
      },
      plan: {
        id: subRow.p_id,
        name: subRow.p_name,
        code: subRow.p_code,
        slug: subRow.p_slug,
        description: subRow.p_description,
        priceMonthly: Number(subRow.p_price_monthly ?? 0),
        priceYearly: Number(subRow.p_price_yearly ?? 0),
        currency: subRow.p_currency,
        displayOrder: subRow.p_display_order,
        isActive: subRow.p_is_active,
        isPublic: subRow.p_is_public,
        isDefault: subRow.p_is_default,
        isArchived: subRow.p_is_archived,
        trialEnabled: subRow.p_trial_enabled,
        trialDays: subRow.p_trial_days,
      },
      limits: {
        maxProjects: limitsRow.max_projects ?? null,
        maxAgents: limitsRow.max_agents ?? null,
        maxKnowledgeBases: limitsRow.max_knowledge_bases ?? null,
        maxKnowledgeDocuments: limitsRow.max_knowledge_documents ?? null,
        monthlyAiCredits: limitsRow.monthly_ai_credits ?? null,
        maxTeamMembers: limitsRow.max_team_members ?? null,
        maxWhatsappConnections: limitsRow.max_whatsapp_connections ?? null,
        voiceAiMinutes: limitsRow.voice_ai_minutes ?? null,
        requestsPerDay: limitsRow.requests_per_day ?? null,
        requestsPerMonth: limitsRow.requests_per_month ?? null,
        tokensPerDay: limitsRow.tokens_per_day ?? null,
        tokensPerMonth: limitsRow.tokens_per_month ?? null,
        conversationsPerDay: limitsRow.conversations_per_day ?? null,
        conversationsPerMonth: limitsRow.conversations_per_month ?? null,
      },
      features,
    };
  }

  async canUseFeature(organizationId, featureKey) {
    const details = await this.getSubscriptionWithPlan(organizationId);

    // Check subscription status
    if (["EXPIRED", "SUSPENDED"].includes(details.subscription.status)) {
      return {
        allowed: false,
        reason: `Subscription has expired on ${details.subscription.currentPeriodEnd ? new Date(details.subscription.currentPeriodEnd).toLocaleDateString() : "earlier date"}. Please renew your plan to access feature '${featureKey}'.`,
        status: details.subscription.status,
        requiredPlan: "STARTER",
      };
    }

    const isEnabled = details.features[featureKey] ?? false;

    if (!isEnabled) {
      let requiredPlan = "STARTER";
      if (["API_ACCESS", "PRIORITY_SUPPORT"].includes(featureKey))
        requiredPlan = "BUSINESS";
      if (featureKey === "ADVANCED_SECURITY") requiredPlan = "PREMIUM";

      return {
        allowed: false,
        reason: `Feature '${featureKey}' is not included in your ${details.plan.name} plan.`,
        requiredPlan,
      };
    }

    return { allowed: true };
  }

  async getCurrentResourceCount(organizationId, resourceKey) {
    switch (resourceKey) {
      case "AI_AGENTS": {
        const res = await this.dataSource.query(
          `SELECT COUNT(a.id)::int AS count FROM agents a
           INNER JOIN projects p ON p.id = a.project_id
           WHERE p.organization_id = $1 AND a.deleted_at IS NULL AND p.deleted_at IS NULL`,
          [organizationId],
        );
        return Number(res[0]?.count ?? 0);
      }
      case "PROJECTS": {
        const res = await this.dataSource.query(
          "SELECT COUNT(id)::int AS count FROM projects WHERE organization_id = $1 AND deleted_at IS NULL",
          [organizationId],
        );
        return Number(res[0]?.count ?? 0);
      }
      case "KNOWLEDGE_BASES": {
        const res = await this.dataSource.query(
          `SELECT COUNT(ks.id)::int AS count FROM knowledge_sources ks
           INNER JOIN projects p ON p.id = ks.project_id
           WHERE p.organization_id = $1 AND ks.deleted_at IS NULL AND p.deleted_at IS NULL`,
          [organizationId],
        );
        return Number(res[0]?.count ?? 0);
      }
      case "KNOWLEDGE_DOCUMENTS": {
        const res = await this.dataSource.query(
          `SELECT COUNT(kc.id)::int AS count FROM knowledge_chunks kc
           INNER JOIN projects p ON p.id = kc.project_id
           WHERE p.organization_id = $1 AND p.deleted_at IS NULL`,
          [organizationId],
        );
        return Number(res[0]?.count ?? 0);
      }
      case "TEAM_MEMBERS": {
        const res = await this.dataSource.query(
          "SELECT COUNT(id)::int AS count FROM organization_members WHERE organization_id = $1 AND status = 'ACTIVE'",
          [organizationId],
        );
        return Number(res[0]?.count ?? 0);
      }
      case "WHATSAPP_CONNECTIONS": {
        const res = await this.dataSource.query(
          "SELECT COUNT(id)::int AS count FROM whatsapp_connections WHERE organization_id = $1",
          [organizationId],
        );
        return Number(res[0]?.count ?? 0);
      }
      default:
        return 0;
    }
  }

  async canCreateResource(organizationId, resourceKey, overrideCount = null) {
    const details = await this.getSubscriptionWithPlan(organizationId);

    if (["EXPIRED", "SUSPENDED"].includes(details.subscription.status)) {
      throw new AppError(
        `Subscription has expired. Please renew your plan to create new resources.`,
        403,
        "SUBSCRIPTION_EXPIRED",
      );
    }

    let limit = null;
    let requiredPlan = "STARTER";

    switch (resourceKey) {
      case "AI_AGENTS":
        limit = details.limits.maxAgents;
        if (details.plan.code === "FREE") requiredPlan = "STARTER";
        else if (details.plan.code === "STARTER") requiredPlan = "BUSINESS";
        else requiredPlan = "PREMIUM";
        break;
      case "PROJECTS":
        limit = details.limits.maxProjects;
        requiredPlan = details.plan.code === "FREE" ? "STARTER" : "BUSINESS";
        break;
      case "KNOWLEDGE_BASES":
        limit = details.limits.maxKnowledgeBases;
        requiredPlan = details.plan.code === "FREE" ? "STARTER" : "BUSINESS";
        break;
      case "KNOWLEDGE_DOCUMENTS":
        limit = details.limits.maxKnowledgeDocuments;
        requiredPlan = details.plan.code === "FREE" ? "STARTER" : "BUSINESS";
        break;
      case "TEAM_MEMBERS":
        limit = details.limits.maxTeamMembers;
        requiredPlan = details.plan.code === "FREE" ? "STARTER" : "BUSINESS";
        break;
      case "WHATSAPP_CONNECTIONS":
        limit = details.limits.maxWhatsappConnections;
        requiredPlan = details.plan.code === "FREE" ? "STARTER" : "BUSINESS";
        break;
      default:
        break;
    }

    if (limit === null) {
      return { allowed: true, currentUsage: 0, limit: null };
    }

    const currentCount =
      overrideCount !== null
        ? overrideCount
        : await this.getCurrentResourceCount(organizationId, resourceKey);

    if (currentCount >= limit) {
      throw new AppError(
        `Plan limit reached for ${resourceKey.replace(/_/g, " ")}. You have ${currentCount}/${limit} configured. Upgrade to ${requiredPlan} for higher limits.`,
        403,
        "PLAN_LIMIT_REACHED",
        {
          resource: resourceKey,
          currentUsage: currentCount,
          limit,
          requiredPlan,
        },
      );
    }

    return {
      allowed: true,
      currentUsage: currentCount,
      limit,
    };
  }

  async getEntitlements(organizationId) {
    const details = await this.getSubscriptionWithPlan(organizationId);

    const [
      agentsCount,
      projectsCount,
      kbCount,
      docsCount,
      membersCount,
      whatsappCount,
    ] = await Promise.all([
      this.getCurrentResourceCount(organizationId, "AI_AGENTS"),
      this.getCurrentResourceCount(organizationId, "PROJECTS"),
      this.getCurrentResourceCount(organizationId, "KNOWLEDGE_BASES"),
      this.getCurrentResourceCount(organizationId, "KNOWLEDGE_DOCUMENTS"),
      this.getCurrentResourceCount(organizationId, "TEAM_MEMBERS"),
      this.getCurrentResourceCount(organizationId, "WHATSAPP_CONNECTIONS"),
    ]);

    // Additional Platform Admin / Organization Billing details
    let paymentSummary = null;
    let invoices = [];
    let payments = [];
    let subscriptionHistory = [];

    try {
      // Latest Paid Payment Order Summary
      const latestPaymentRes = await this.dataSource.query(
        `SELECT po.*, p.name AS plan_name, p.code AS plan_code 
         FROM payment_orders po
         LEFT JOIN plans p ON p.id = po.plan_id
         WHERE po.organization_id = $1 AND po.status = 'PAID'
         ORDER BY po.updated_at DESC
         LIMIT 1`,
        [organizationId],
      );

      if (latestPaymentRes.length > 0) {
        const row = latestPaymentRes[0];
        paymentSummary = {
          totalPaid: Number(row.amount) / 100,
          currency: row.currency || "INR",
          paymentDate: row.created_at,
          paymentMethod: row.razorpay_payment_id
            ? "Razorpay"
            : "Online Payment",
          transactionId: row.razorpay_payment_id || row.razorpay_order_id,
          planName: row.plan_name,
          billingInterval: row.billing_interval,
        };
      }

      // Invoices
      invoices = await this.dataSource.query(
        `SELECT * FROM invoices WHERE organization_id = $1 ORDER BY payment_date DESC, created_at DESC`,
        [organizationId],
      );

      // Payments History
      payments = await this.dataSource.query(
        `SELECT po.*, p.name AS plan_name, p.code AS plan_code 
         FROM payment_orders po
         LEFT JOIN plans p ON p.id = po.plan_id
         WHERE po.organization_id = $1
         ORDER BY po.created_at DESC`,
        [organizationId],
      );

      // Subscription History
      const historyRows = await this.dataSource.query(
        `SELECT po.id, po.created_at, po.billing_interval, po.amount, po.currency, po.status, p.name AS plan_name, p.code AS plan_code
         FROM payment_orders po
         LEFT JOIN plans p ON p.id = po.plan_id
         WHERE po.organization_id = $1 AND po.status = 'PAID'
         ORDER BY po.created_at DESC`,
        [organizationId],
      );

      subscriptionHistory = historyRows.map((row, idx) => ({
        id: row.id,
        date: row.created_at,
        planName: row.plan_name,
        planCode: row.plan_code,
        billingInterval: row.billing_interval,
        amount: Number(row.amount) / 100,
        currency: row.currency || "INR",
        status: idx === 0 ? "ACTIVE" : "REPLACED",
        transitionType: idx === 0 ? "Current Plan" : "Historical Plan",
      }));
    } catch (err) {
      console.warn(
        "[ENTITLEMENT SERVICE] Extended billing info warning:",
        err.message,
      );
    }

    return {
      subscription: details.subscription,
      plan: details.plan,
      features: details.features,
      limits: details.limits,
      usage: {
        agents: { current: agentsCount, limit: details.limits.maxAgents },
        projects: { current: projectsCount, limit: details.limits.maxProjects },
        knowledgeBases: {
          current: kbCount,
          limit: details.limits.maxKnowledgeBases,
        },
        knowledgeDocuments: {
          current: docsCount,
          limit: details.limits.maxKnowledgeDocuments,
        },
        teamMembers: {
          current: membersCount,
          limit: details.limits.maxTeamMembers,
        },
        whatsappConnections: {
          current: whatsappCount,
          limit: details.limits.maxWhatsappConnections,
        },
        voiceAiMinutes: { current: 0, limit: details.limits.voiceAiMinutes },
        aiCredits: { current: 0, limit: details.limits.monthlyAiCredits },
      },
      paymentSummary,
      invoices,
      payments,
      subscriptionHistory,
    };
  }

  async changeSubscription(
    organizationId,
    targetPlanId,
    billingInterval = "MONTHLY",
  ) {
    const planRes = await this.dataSource.query(
      "SELECT * FROM plans WHERE id = $1 AND is_active = true AND is_archived = false LIMIT 1",
      [targetPlanId],
    );

    if (planRes.length === 0) {
      throw new AppError(
        "Invalid or inactive plan selected.",
        400,
        "INVALID_PLAN",
      );
    }

    const plan = planRes[0];

    // Restrict switching to FREE plan if an active paid plan is in effect
    const currentSubDetails =
      await this.getSubscriptionWithPlan(organizationId);
    const isCurrentPaidActive =
      currentSubDetails?.subscription?.status === "ACTIVE" &&
      currentSubDetails?.plan?.code !== "FREE";

    if (isCurrentPaidActive && plan.code === "FREE") {
      throw new AppError(
        "Cannot switch to the Free plan while an active paid subscription is in effect. You can upgrade to another plan or wait until your subscription expires.",
        400,
        "FREE_PLAN_RESTRICTED",
      );
    }

    let periodEndInterval = "1 month";
    if (billingInterval === "QUARTERLY") {
      periodEndInterval = "3 months";
    } else if (billingInterval === "YEARLY") {
      periodEndInterval = "1 year";
    }

    // Update organization plan_id & subscription record with stacked current_period_end
    await this.dataSource.query(
      "UPDATE organizations SET plan_id = $1 WHERE id = $2",
      [plan.id, organizationId],
    );

    await this.dataSource.query(
      `
      INSERT INTO subscriptions (organization_id, plan_id, status, billing_interval, current_period_start, current_period_end)
      VALUES ($1, $2, 'ACTIVE', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '${periodEndInterval}')
      ON CONFLICT (organization_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = 'ACTIVE',
        billing_interval = EXCLUDED.billing_interval,
        current_period_start = CASE
          WHEN subscriptions.plan_id = EXCLUDED.plan_id AND subscriptions.status = 'ACTIVE' AND subscriptions.current_period_end IS NOT NULL AND subscriptions.current_period_end > CURRENT_TIMESTAMP
          THEN subscriptions.current_period_start
          ELSE CURRENT_TIMESTAMP
        END,
        current_period_end = CASE
          WHEN subscriptions.plan_id = EXCLUDED.plan_id AND subscriptions.status = 'ACTIVE' AND subscriptions.current_period_end IS NOT NULL AND subscriptions.current_period_end > CURRENT_TIMESTAMP
          THEN subscriptions.current_period_end + INTERVAL '${periodEndInterval}'
          ELSE CURRENT_TIMESTAMP + INTERVAL '${periodEndInterval}'
        END,
        updated_at = CURRENT_TIMESTAMP
      `,
      [organizationId, plan.id, billingInterval],
    );

    if (this.organizationModelEntitlementService) {
      try {
        await this.organizationModelEntitlementService.syncOrganizationModelEntitlements(
          {
            organizationId,
            planCode: plan.code,
          },
        );
      } catch (err) {
        console.error(
          "Failed to sync AI model entitlements on subscription change:",
          err,
        );
      }
    }

    return this.getEntitlements(organizationId);
  }

  async resetDevSubscription(organizationId) {
    const isDevEnv =
      process.env.NODE_ENV === "development" ||
      !process.env.NODE_ENV ||
      process.env.NODE_ENV !== "production";

    if (!isDevEnv) {
      throw new AppError(
        "Development subscription reset is only available in local development mode.",
        403,
        "FORBIDDEN_IN_PRODUCTION",
      );
    }

    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "INVALID_ORGANIZATION_ID",
      );
    }

    let deletedPdfPaths = [];
    let previousPlanCode = "UNKNOWN";

    await this.dataSource.transaction(async (transactionalEntityManager) => {
      const orgRes = await transactionalEntityManager.query(
        "SELECT id, plan_id FROM organizations WHERE id = $1 LIMIT 1",
        [organizationId],
      );

      if (orgRes.length === 0) {
        throw new AppError(
          "Organization not found.",
          404,
          "ORGANIZATION_NOT_FOUND",
        );
      }

      if (orgRes[0].plan_id) {
        const prevPlanRes = await transactionalEntityManager.query(
          "SELECT code FROM plans WHERE id = $1 LIMIT 1",
          [orgRes[0].plan_id],
        );
        if (prevPlanRes[0]?.code) {
          previousPlanCode = prevPlanRes[0].code;
        }
      }

      const freePlanRes = await transactionalEntityManager.query(
        "SELECT id, name, code FROM plans WHERE code = 'FREE' OR is_default = true OR slug = 'free' ORDER BY is_default DESC LIMIT 1",
      );

      if (freePlanRes.length === 0) {
        throw new AppError(
          "Free plan configuration not found in database.",
          404,
          "FREE_PLAN_NOT_FOUND",
        );
      }
      const freePlan = freePlanRes[0];

      const pdfRes = await transactionalEntityManager.query(
        "SELECT pdf_path FROM invoices WHERE organization_id = $1 AND pdf_path IS NOT NULL",
        [organizationId],
      );
      deletedPdfPaths = pdfRes.map((r) => r.pdf_path).filter(Boolean);

      await transactionalEntityManager.query(
        "DELETE FROM invoices WHERE organization_id = $1",
        [organizationId],
      );

      await transactionalEntityManager.query(
        "DELETE FROM payment_orders WHERE organization_id = $1",
        [organizationId],
      );

      await transactionalEntityManager.query(
        "UPDATE organizations SET plan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [freePlan.id, organizationId],
      );

      await transactionalEntityManager.query(
        `
        INSERT INTO subscriptions (organization_id, plan_id, status, billing_interval, current_period_start, current_period_end)
        VALUES ($1, $2, 'ACTIVE', 'MONTHLY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month')
        ON CONFLICT (organization_id) DO UPDATE SET
          plan_id = EXCLUDED.plan_id,
          status = 'ACTIVE',
          billing_interval = 'MONTHLY',
          current_period_start = CURRENT_TIMESTAMP,
          current_period_end = CURRENT_TIMESTAMP + INTERVAL '1 month',
          canceled_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        `,
        [organizationId, freePlan.id],
      );

      if (this.organizationModelEntitlementService) {
        await this.organizationModelEntitlementService.syncOrganizationModelEntitlements(
          {
            organizationId,
            planCode: freePlan.code,
            runner: transactionalEntityManager,
          },
        );
      }
    });

    for (const relativePath of deletedPdfPaths) {
      try {
        const fullPath = path.resolve(
          process.cwd(),
          relativePath.replace(/^\//, ""),
        );
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (fileErr) {
        console.warn(
          "[SUBSCRIPTION DEV RESET FILE UNLINK WARN]",
          fileErr.message,
        );
      }
    }

    console.log("[SUBSCRIPTION DEV RESET AUDIT]", {
      organizationId,
      previousPlan: previousPlanCode,
      newPlan: "FREE",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message:
        "Development subscription reset successfully. The organization is now on the Free plan.",
      plan: "FREE",
    };
  }
}
