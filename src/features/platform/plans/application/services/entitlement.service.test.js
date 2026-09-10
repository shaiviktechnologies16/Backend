import test from "node:test";
import assert from "node:assert";
import { EntitlementService } from "./entitlement.service.js";
import { createEntitlementMiddleware } from "../../../../../common/middleware/entitlement.middleware.js";

test("EntitlementService returns allowed when count is under limit", async () => {
  const mockDataSource = {
    query: async (sql, params) => {
      if (sql.includes("FROM subscriptions")) {
        return [
          {
            subscription_id: "sub-1",
            organization_id: "org-1",
            plan_id: "plan-1",
            status: "ACTIVE",
            billing_interval: "MONTHLY",
            p_id: "plan-1",
            p_name: "Starter",
            p_code: "STARTER",
          },
        ];
      }
      if (sql.includes("FROM plan_usage_limits")) {
        return [
          {
            max_agents: 5,
            max_projects: 3,
          },
        ];
      }
      if (sql.includes("FROM plan_features")) {
        return [
          { feature_key: "AI_AGENTS", is_enabled: true },
          { feature_key: "WHATSAPP", is_enabled: false },
        ];
      }
      if (sql.includes("FROM agents")) {
        return [{ count: 2 }];
      }
      return [];
    },
  };

  const entitlementService = new EntitlementService({
    dataSource: mockDataSource,
    planRepository: {},
  });

  const res = await entitlementService.canCreateResource("org-1", "AI_AGENTS");
  assert.strictEqual(res.allowed, true);
  assert.strictEqual(res.currentUsage, 2);
  assert.strictEqual(res.limit, 5);
});

test("EntitlementService throws PLAN_LIMIT_REACHED error when limit exceeded", async () => {
  const mockDataSource = {
    query: async (sql, params) => {
      if (sql.includes("FROM subscriptions")) {
        return [
          {
            subscription_id: "sub-1",
            organization_id: "org-1",
            plan_id: "plan-free",
            status: "ACTIVE",
            billing_interval: "MONTHLY",
            p_id: "plan-free",
            p_name: "Free",
            p_code: "FREE",
          },
        ];
      }
      if (sql.includes("FROM plan_usage_limits")) {
        return [
          {
            max_agents: 1,
            max_projects: 1,
          },
        ];
      }
      if (sql.includes("FROM plan_features")) {
        return [{ feature_key: "AI_AGENTS", is_enabled: true }];
      }
      if (sql.includes("FROM agents")) {
        return [{ count: 1 }];
      }
      return [];
    },
  };

  const entitlementService = new EntitlementService({
    dataSource: mockDataSource,
    planRepository: {},
  });

  await assert.rejects(
    async () => {
      await entitlementService.canCreateResource("org-1", "AI_AGENTS");
    },
    (err) => {
      assert.strictEqual(err.statusCode, 403);
      assert.strictEqual(err.errorCode, "PLAN_LIMIT_REACHED");
      return true;
    },
  );
});

test("createEntitlementMiddleware intercepts request and passes errors correctly", async () => {
  const mockEntitlementService = {
    canUseFeature: async (orgId, featureKey) => {
      if (featureKey === "DISABLED_FEATURE") {
        return {
          allowed: false,
          reason: "Feature disabled",
          requiredPlan: "STARTER",
        };
      }
      return { allowed: true };
    },
    canCreateResource: async (orgId, resourceKey) => {
      if (resourceKey === "MAXED_RESOURCE") {
        const error = new Error("Plan limit reached");
        error.statusCode = 403;
        error.errorCode = "PLAN_LIMIT_REACHED";
        throw error;
      }
      return { allowed: true };
    },
  };

  const middleware = createEntitlementMiddleware(mockEntitlementService);

  const reqAllowed = { context: { organizationId: "org-1" } };
  let nextCalled = false;
  await middleware.requireFeature("AI_AGENTS")(reqAllowed, {}, () => {
    nextCalled = true;
  });
  assert.strictEqual(nextCalled, true);

  const reqDisabled = { context: { organizationId: "org-1" } };
  let capturedError = null;
  await middleware.requireFeature("DISABLED_FEATURE")(
    reqDisabled,
    {},
    (err) => {
      capturedError = err;
    },
  );
  assert.ok(capturedError);
  assert.strictEqual(capturedError.statusCode, 403);
  assert.strictEqual(capturedError.errorCode, "FEATURE_NOT_INCLUDED");
});

test("EntitlementService blocks resource creation when subscription is EXPIRED", async () => {
  const mockDataSource = {
    query: async (sql, params) => {
      if (sql.includes("FROM subscriptions")) {
        return [
          {
            subscription_id: "sub-1",
            organization_id: "org-1",
            plan_id: "plan-starter",
            status: "EXPIRED",
            billing_interval: "MONTHLY",
            current_period_end: new Date(Date.now() - 86400000).toISOString(),
            p_id: "plan-starter",
            p_name: "Starter",
            p_code: "STARTER",
          },
        ];
      }
      if (sql.includes("FROM plan_usage_limits")) {
        return [{ max_agents: 5 }];
      }
      if (sql.includes("FROM plan_features")) {
        return [{ feature_key: "AI_AGENTS", is_enabled: true }];
      }
      return [];
    },
  };

  const entitlementService = new EntitlementService({
    dataSource: mockDataSource,
    planRepository: {},
  });

  await assert.rejects(
    async () => {
      await entitlementService.canCreateResource("org-1", "AI_AGENTS");
    },
    (err) => {
      assert.strictEqual(err.statusCode, 403);
      assert.strictEqual(err.errorCode, "SUBSCRIPTION_EXPIRED");
      return true;
    },
  );
});

test("EntitlementService resetDevSubscription resets organization to Free plan in development and rejects in production", async () => {
  const executedQueries = [];
  const mockDataSource = {
    query: async (sql, params) => {
      executedQueries.push({ sql, params });
      return [];
    },
    transaction: async (cb) => {
      const mockEntityManager = {
        query: async (sql, params) => {
          executedQueries.push({ sql, params });
          if (sql.includes("FROM organizations")) {
            return [{ id: "org-123", plan_id: "plan-business" }];
          }
          if (sql.includes("FROM plans WHERE id")) {
            return [{ code: "BUSINESS" }];
          }
          if (sql.includes("FROM plans WHERE code = 'FREE'")) {
            return [{ id: "plan-free", name: "Free", code: "FREE" }];
          }
          if (sql.includes("FROM invoices")) {
            return [{ pdf_path: "/uploads/INVOICES/test-inv.pdf" }];
          }
          return [];
        },
      };
      return cb(mockEntityManager);
    },
  };

  const entitlementService = new EntitlementService({
    dataSource: mockDataSource,
    planRepository: {},
  });

  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    await assert.rejects(
      async () => {
        await entitlementService.resetDevSubscription("org-123");
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.errorCode, "FORBIDDEN_IN_PRODUCTION");
        return true;
      },
    );

    process.env.NODE_ENV = "development";
    const res = await entitlementService.resetDevSubscription("org-123");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.plan, "FREE");

    const deleteInvoicesQuery = executedQueries.find((q) =>
      q.sql.includes("DELETE FROM invoices"),
    );
    assert.ok(deleteInvoicesQuery);

    const deletePaymentsQuery = executedQueries.find((q) =>
      q.sql.includes("DELETE FROM payment_orders"),
    );
    assert.ok(deletePaymentsQuery);

    const updateOrgQuery = executedQueries.find((q) =>
      q.sql.includes("UPDATE organizations SET plan_id = $1"),
    );
    assert.ok(updateOrgQuery);
    assert.strictEqual(updateOrgQuery.params[0], "plan-free");
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});
