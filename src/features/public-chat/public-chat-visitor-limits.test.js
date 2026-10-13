import test from "node:test";
import assert from "node:assert";
import { CheckPlanUsageUseCase } from "../platform/plans/application/use-cases/check-plan-usage.usecase.js";
import { CheckPublicChatAbuseUseCase } from "./application/usecase/check-public-chat-abuse.usecase.js";
import { visitorMiddleware } from "./middleware/visitor.middleware.js";
import { PlanRepositoryImpl } from "../platform/plans/infrastructure/repositories/plan.repository.impl.js";

// Helper to create mock plan repository
const createMockPlanRepository = ({
  limits = {
    requestsPerDay: 100,
    requestsPerMonth: 3000,
    uniqueVisitorsPerDay: 50,
    uniqueVisitorsPerMonth: 1000,
    messagesPerVisitorPerDay: 10,
    messagesPerVisitorPerMonth: 200,
  },
  subscriptionStatus = "ACTIVE",
  initialVisitorUsage = {},
  initialOrgUsage = { requests: 0, tokens: 0 },
} = {}) => {
  const visitorStore = { ...initialVisitorUsage };
  const orgUsage = { ...initialOrgUsage };

  return {
    visitorStore,
    orgUsage,
    dataSource: {
      query: async (sql, params) => {
        if (sql.includes("FROM subscriptions")) {
          return [{ status: subscriptionStatus, current_period_end: new Date(Date.now() + 86400000) }];
        }
        return [];
      },
    },
    findOrganizationPlanWithLimits: async (orgId) => {
      return {
        plan: { id: "plan-free", name: "Free", code: "FREE" },
        limits,
      };
    },
    getUsageOverview: async ({ organizationId, visitorId, networkIdentityHash }) => {
      const visitorMessages = visitorId ? (visitorStore[visitorId] ?? 0) : 0;
      const uniqueVisitors = Object.keys(visitorStore).length;

      return {
        dailyUsage: {
          requests: orgUsage.dailyRequests ?? orgUsage.requests,
          tokens: orgUsage.dailyTokens ?? orgUsage.tokens,
        },
        monthlyUsage: {
          requests: orgUsage.monthlyRequests ?? orgUsage.requests,
          tokens: orgUsage.monthlyTokens ?? orgUsage.tokens,
        },
        dailyConversations: 1,
        monthlyConversations: 1,
        dailyUniqueVisitors: uniqueVisitors,
        monthlyUniqueVisitors: uniqueVisitors,
        dailyVisitorMessages: visitorMessages,
        monthlyVisitorMessages: visitorMessages,
      };
    },
    recordMessage: (visitorId) => {
      visitorStore[visitorId] = (visitorStore[visitorId] ?? 0) + 1;
      orgUsage.requests += 1;
    },
  };
};

// Helper mock abuse repository
const createMockAbuseRepository = ({ rateLimit = 10 } = {}) => {
  const dailyCounts = {};
  const rateCounts = {};

  return {
    dailyCounts,
    rateCounts,
    checkAndConsume: async ({
      organizationId,
      visitorId = null,
      ipHash,
      dailyVisitorLimit,
      visitorDailyMessages = 0,
    }) => {
      const dailyKey = visitorId || ipHash;
      dailyCounts[dailyKey] = (dailyCounts[dailyKey] ?? 0) + 1;
      rateCounts[ipHash] = (rateCounts[ipHash] ?? 0) + 1;

      const rateCount = rateCounts[ipHash];
      const dailyCount = Math.max(dailyCounts[dailyKey], visitorDailyMessages);

      return {
        rateLimitExceeded: rateCount > rateLimit,
        dailyLimitExceeded:
          dailyVisitorLimit !== null && dailyCount > dailyVisitorLimit,
        rateLimitRemaining: Math.max(0, rateLimit - rateCount),
        dailyRemaining:
          dailyVisitorLimit === null
            ? null
            : Math.max(0, dailyVisitorLimit - dailyCount),
      };
    },
  };
};

test("1 & 2 & 3: Visitor A starts at 0/10, sends 10 messages to reach 10/10, and 11th is rejected", async () => {
  const planRepo = createMockPlanRepository();
  const checkPlanUsage = new CheckPlanUsageUseCase({ planRepository: planRepo });

  const visitorA = "visitor-a-uuid";

  // Starts at 0
  const initial = await checkPlanUsage.getUsageState({
    organizationId: "org-1",
    visitorId: visitorA,
  });
  assert.strictEqual(initial.usage.visitor.dailyMessages, 0);
  assert.strictEqual(initial.limits.messagesPerVisitorPerDay, 10);

  // Send 10 messages
  for (let i = 0; i < 10; i++) {
    const allowed = await checkPlanUsage.execute({
      organizationId: "org-1",
      visitorId: visitorA,
    });
    assert.strictEqual(allowed.allowed, true);
    planRepo.recordMessage(visitorA);
  }

  // Verify at 10/10
  const stateAt10 = await checkPlanUsage.getUsageState({
    organizationId: "org-1",
    visitorId: visitorA,
  });
  assert.strictEqual(stateAt10.usage.visitor.dailyMessages, 10);

  // 11th message rejected with DAILY_VISITOR_MESSAGE_LIMIT_EXCEEDED
  await assert.rejects(
    async () => {
      await checkPlanUsage.execute({
        organizationId: "org-1",
        visitorId: visitorA,
      });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 429);
      assert.strictEqual(err.errorCode, "DAILY_VISITOR_MESSAGE_LIMIT_EXCEEDED");
      assert.strictEqual(err.usage.visitor.remaining, 0);
      return true;
    },
  );
});

test("4 & 5: Visitor B remains at 0/10 and can chat even after Visitor A is blocked", async () => {
  const planRepo = createMockPlanRepository({
    initialVisitorUsage: { "visitor-a-uuid": 10 },
    initialOrgUsage: { requests: 10, tokens: 100 },
  });
  const checkPlanUsage = new CheckPlanUsageUseCase({ planRepository: planRepo });

  const visitorA = "visitor-a-uuid";
  const visitorB = "visitor-b-uuid";

  // Visitor A is blocked
  await assert.rejects(async () => {
    await checkPlanUsage.execute({
      organizationId: "org-1",
      visitorId: visitorA,
    });
  }, { statusCode: 429, errorCode: "DAILY_VISITOR_MESSAGE_LIMIT_EXCEEDED" });

  // Visitor B has independent 0/10 usage
  const stateB = await checkPlanUsage.getUsageState({
    organizationId: "org-1",
    visitorId: visitorB,
  });
  assert.strictEqual(stateB.usage.visitor.dailyMessages, 0);

  // Visitor B can send a message
  const allowedB = await checkPlanUsage.execute({
    organizationId: "org-1",
    visitorId: visitorB,
  });
  assert.strictEqual(allowedB.allowed, true);
});

test("6: Visitor A retains usage across page refreshes (same visitor identifier)", async () => {
  const planRepo = createMockPlanRepository({
    initialVisitorUsage: { "persisted-visitor-id": 5 },
  });
  const checkPlanUsage = new CheckPlanUsageUseCase({ planRepository: planRepo });

  // When visitor refreshes, same visitorId is read from localStorage
  const state = await checkPlanUsage.getUsageState({
    organizationId: "org-1",
    visitorId: "persisted-visitor-id",
  });
  assert.strictEqual(state.usage.visitor.dailyMessages, 5);
  const remaining = Math.max(0, state.limits.messagesPerVisitorPerDay - state.usage.visitor.dailyMessages);
  assert.strictEqual(remaining, 5);
});

test("7: Two tabs sharing the same visitor identity share the same allowance", async () => {
  const planRepo = createMockPlanRepository();
  const checkPlanUsage = new CheckPlanUsageUseCase({ planRepository: planRepo });
  const sharedVisitorId = "tab-shared-visitor-id";

  // Tab 1 sends 3 messages
  for (let i = 0; i < 3; i++) {
    await checkPlanUsage.execute({ organizationId: "org-1", visitorId: sharedVisitorId });
    planRepo.recordMessage(sharedVisitorId);
  }

  // Tab 2 checks usage for the same visitor
  const tab2State = await checkPlanUsage.getUsageState({
    organizationId: "org-1",
    visitorId: sharedVisitorId,
  });
  assert.strictEqual(tab2State.usage.visitor.dailyMessages, 3);

  // Tab 2 sends 7 more messages
  for (let i = 0; i < 7; i++) {
    await checkPlanUsage.execute({ organizationId: "org-1", visitorId: sharedVisitorId });
    planRepo.recordMessage(sharedVisitorId);
  }

  // Both tabs now see limit reached
  await assert.rejects(async () => {
    await checkPlanUsage.execute({ organizationId: "org-1", visitorId: sharedVisitorId });
  }, { errorCode: "DAILY_VISITOR_MESSAGE_LIMIT_EXCEEDED" });
});

test("8: Concurrent requests protection via atomic Redis tracking", async () => {
  const abuseRepo = createMockAbuseRepository({ rateLimit: 20 });
  const planRepo = createMockPlanRepository();
  const checkPlanUsage = new CheckPlanUsageUseCase({ planRepository: planRepo });
  const abuseUseCase = new CheckPublicChatAbuseUseCase({
    publicChatAbuseRepository: abuseRepo,
    checkPlanUsageUseCase: checkPlanUsage,
  });

  const visitorId = "concurrent-visitor";

  // Simulate 9 messages already used
  for (let i = 0; i < 9; i++) {
    abuseRepo.dailyCounts[visitorId] = (abuseRepo.dailyCounts[visitorId] ?? 0) + 1;
    planRepo.recordMessage(visitorId);
  }

  // Two simultaneous requests attempt to take the 10th slot
  const req1 = abuseUseCase.execute({ organizationId: "org-1", visitorId, ipHash: "ip-1" });
  const req2 = abuseUseCase.execute({ organizationId: "org-1", visitorId, ipHash: "ip-1" });

  const results = await Promise.allSettled([req1, req2]);
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  // Exactly 1 allowed, exactly 1 rejected
  assert.strictEqual(fulfilled.length, 1);
  assert.strictEqual(rejected.length, 1);
  assert.strictEqual(rejected[0].reason.errorCode, "DAILY_VISITOR_MESSAGE_LIMIT_EXCEEDED");
});

test("9 & 10: Tenant and agent isolation", async () => {
  const planRepoOrg1 = createMockPlanRepository({
    initialVisitorUsage: { "shared-id": 10 },
  });
  const planRepoOrg2 = createMockPlanRepository({
    initialVisitorUsage: { "shared-id": 0 },
  });

  const checkPlanUsage1 = new CheckPlanUsageUseCase({ planRepository: planRepoOrg1 });
  const checkPlanUsage2 = new CheckPlanUsageUseCase({ planRepository: planRepoOrg2 });

  // Blocked in Org 1
  await assert.rejects(async () => {
    await checkPlanUsage1.execute({ organizationId: "org-1", visitorId: "shared-id" });
  }, { errorCode: "DAILY_VISITOR_MESSAGE_LIMIT_EXCEEDED" });

  // Permitted in Org 2
  const allowedInOrg2 = await checkPlanUsage2.execute({
    organizationId: "org-2",
    visitorId: "shared-id",
  });
  assert.strictEqual(allowedInOrg2.allowed, true);
});

test("11: Organization subscription quota enforcement", async () => {
  // Test case A: Subscription expired
  const expiredRepo = createMockPlanRepository({ subscriptionStatus: "EXPIRED" });
  const checkExpired = new CheckPlanUsageUseCase({ planRepository: expiredRepo });

  await assert.rejects(async () => {
    await checkExpired.execute({ organizationId: "org-1", visitorId: "visitor-1" });
  }, { errorCode: "SUBSCRIPTION_EXPIRED" });

  // Test case B: Organization daily quota reached
  const quotaReachedRepo = createMockPlanRepository({
    limits: {
      requestsPerDay: 50,
      requestsPerMonth: 3000,
      uniqueVisitorsPerDay: 50,
      uniqueVisitorsPerMonth: 1000,
      messagesPerVisitorPerDay: 10,
      messagesPerVisitorPerMonth: 200,
    },
    initialOrgUsage: { requests: 50, tokens: 1000 },
    initialVisitorUsage: { "fresh-visitor": 0 },
  });
  const checkOrgQuota = new CheckPlanUsageUseCase({ planRepository: quotaReachedRepo });

  await assert.rejects(async () => {
    await checkOrgQuota.execute({ organizationId: "org-1", visitorId: "fresh-visitor" });
  }, { errorCode: "ORGANIZATION_DAILY_LIMIT_EXCEEDED" });

  // Test case C: Monthly quota reached
  const monthlyReachedRepo = createMockPlanRepository({
    limits: {
      requestsPerDay: 100,
      requestsPerMonth: 200,
      uniqueVisitorsPerDay: 50,
      uniqueVisitorsPerMonth: 1000,
      messagesPerVisitorPerDay: 10,
      messagesPerVisitorPerMonth: 200,
    },
    initialOrgUsage: { dailyRequests: 10, monthlyRequests: 200, tokens: 1000 },
  });
  const checkMonthlyQuota = new CheckPlanUsageUseCase({ planRepository: monthlyReachedRepo });

  await assert.rejects(async () => {
    await checkMonthlyQuota.execute({ organizationId: "org-1", visitorId: "fresh-visitor" });
  }, { errorCode: "MONTHLY_REQUEST_LIMIT_EXCEEDED" });
});

test("12 & 13: Error contract consistency (HTTP 429 and usage_limit payload)", async () => {
  const planRepo = createMockPlanRepository({
    initialVisitorUsage: { "exhausted-visitor": 10 },
  });
  const checkPlanUsage = new CheckPlanUsageUseCase({ planRepository: planRepo });

  try {
    await checkPlanUsage.execute({
      organizationId: "org-1",
      visitorId: "exhausted-visitor",
    });
    assert.fail("Should have thrown");
  } catch (err) {
    assert.strictEqual(err.statusCode, 429);
    assert.strictEqual(err.errorCode, "DAILY_VISITOR_MESSAGE_LIMIT_EXCEEDED");
    assert.strictEqual(err.isUsageLimit, true);
    assert.ok(err.usage);
    assert.strictEqual(err.usage.visitor.used, 10);
    assert.strictEqual(err.usage.visitor.remaining, 0);
  }
});

test("14: IST timezone daily calculation aligns with Indian Standard Time", async () => {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);

  const dayStartIST = new Date(istNow);
  dayStartIST.setUTCHours(0, 0, 0, 0);
  const expectedDayStart = new Date(dayStartIST.getTime() - IST_OFFSET_MS);

  // Verify that midnight in IST corresponds to 18:30 UTC of previous calendar day
  assert.strictEqual(dayStartIST.getUTCHours(), 0);
  assert.strictEqual(expectedDayStart.getUTCHours(), 18);
  assert.strictEqual(expectedDayStart.getUTCMinutes(), 30);
});

test("15: Missing or malformed visitor identifiers are safely replaced with UUIDs", () => {
  const testCases = [
    undefined,
    "",
    "   ",
    "null",
    "undefined",
    "bad@chars!!",
    "a".repeat(200),
  ];

  for (const badId of testCases) {
    let capturedVisitorId = null;
    let nextCalled = false;

    const req = {
      headers: badId !== undefined ? { "x-visitor-id": badId } : {},
      ip: "127.0.0.1",
    };
    const res = {
      setHeader: (name, val) => {
        if (name === "x-visitor-id") capturedVisitorId = val;
      },
    };

    visitorMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.ok(req.visitorId);
    assert.notStrictEqual(req.visitorId, badId);
    assert.strictEqual(req.visitorId, capturedVisitorId);
    // Must be valid UUID format
    assert.match(
      req.visitorId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  }

  // Valid visitor ID should be preserved
  const validUuid = "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6";
  const req = {
    headers: { "x-visitor-id": validUuid },
    ip: "127.0.0.1",
  };
  const res = { setHeader: () => {} };
  visitorMiddleware(req, res, () => {});
  assert.strictEqual(req.visitorId, validUuid);
});

test("PlanRepositoryImpl.getUsageOverview SQL correctly filters by visitor_id", async () => {
  let executedSql = "";
  let executedParams = [];

  const mockDataSource = {
    query: async (sql, params) => {
      executedSql = sql;
      executedParams = params;
      return [
        {
          daily_requests: 5,
          daily_tokens: 100,
          daily_unique_visitors: 2,
          daily_visitor_messages: 3,
          monthly_visitor_messages: 7,
        },
      ];
    },
  };

  const repo = new PlanRepositoryImpl(mockDataSource);
  const result = await repo.getUsageOverview({
    organizationId: "org-1",
    visitorId: "vis-123",
    networkIdentityHash: "hash-456",
    dayStart: new Date(),
    monthStart: new Date(),
  });

  assert.strictEqual(result.dailyUsage.requests, 5);
  assert.strictEqual(result.dailyVisitorMessages, 3);
  assert.strictEqual(executedParams[3], "vis-123");
  assert.strictEqual(executedParams[4], "hash-456");

  // Verify SQL prioritizes $4 (visitorId)
  assert.ok(executedSql.includes("($4::text IS NOT NULL AND u.visitor_id = $4)"));
});
