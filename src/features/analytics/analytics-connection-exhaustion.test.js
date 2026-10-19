import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { AppDataSource, getPoolDiagnostics } from "../../database/datasource.js";
import { AnalyticsRepositoryImpl } from "./infrastructure/repositories/analytics.repository.impl.js";
import { AnalyticsService } from "./application/services/analytics.service.js";
import { GetAnalyticsOverviewUseCase } from "./application/use-cases/get-analytics-overview.usecase.js";
import { GetAnalyticsTrendsUseCase } from "./application/use-cases/get-analytics-trends.usecase.js";
import { errorMiddleware } from "../../common/middleware/error.middleware.js";

describe("PostgreSQL Connection Sizing & Analytics Resilience", () => {
  it("PHASE 2 & 5: Verifies database pool is conservatively sized to 3 with safe diagnostics", () => {
    const diagnostics = getPoolDiagnostics(AppDataSource);

    assert.ok(typeof diagnostics.totalCount === "number", "totalCount must be a number");
    assert.ok(typeof diagnostics.idleCount === "number", "idleCount must be a number");
    assert.ok(typeof diagnostics.waitingCount === "number", "waitingCount must be a number");
    assert.equal(diagnostics.maxLimit, 3, "Pool maximum must be conservatively configured to 3");
  });

  it("PHASE 3: Handles getOverview with empty datasets cleanly without crashing", async () => {
    const emptyMockDataSource = {
      manager: {
        query: async (sql) => {
          if (sql.includes("COUNT(*)::int AS count") || sql.includes("projects,")) {
            return [
              {
                projects: 0,
                agents: 0,
                conversations: 0,
                messages: 0,
                activeUsers: 0,
              },
            ];
          }
          // Empty usage table
          return [];
        },
      },
    };

    const repo = new AnalyticsRepositoryImpl(emptyMockDataSource);
    const result = await repo.getOverview({
      type: "WORKSPACE",
      organizationId: "non-existent-org-id",
    });

    assert.deepEqual(result, {
      projects: 0,
      agents: 0,
      conversations: 0,
      messages: 0,
      activeUsers: 0,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      averageResponseTimeMs: 0,
    });
  });

  it("PHASE 3: getOverview executes consolidated counts and usage sequentially", async () => {
    let concurrentCheckouts = 0;
    let peakConcurrentCheckouts = 0;

    const trackingDataSource = {
      manager: {
        query: async () => {
          concurrentCheckouts += 1;
          if (concurrentCheckouts > peakConcurrentCheckouts) {
            peakConcurrentCheckouts = concurrentCheckouts;
          }
          await new Promise((resolve) => setTimeout(resolve, 5));
          concurrentCheckouts -= 1;
          return [
            {
              projects: 2,
              agents: 1,
              conversations: 10,
              messages: 40,
              activeUsers: 3,
              requests: 15,
              inputTokens: 1000,
              outputTokens: 200,
              totalTokens: 1200,
              averageResponseTimeMs: 450,
            },
          ];
        },
      },
    };

    const repo = new AnalyticsRepositoryImpl(trackingDataSource);
    const result = await repo.getOverview({
      type: "WORKSPACE",
      organizationId: "org-test-1",
    });

    assert.equal(
      peakConcurrentCheckouts,
      1,
      "getOverview must not check out multiple connections simultaneously",
    );
    assert.equal(result.projects, 2);
    assert.equal(result.requests, 15);
  });

  it("PHASE 3: getTrends executes queries sequentially without parallel connection fan-out", async () => {
    let concurrentCheckouts = 0;
    let peakConcurrentCheckouts = 0;

    const trackingDataSource = {
      manager: {
        query: async () => {
          concurrentCheckouts += 1;
          if (concurrentCheckouts > peakConcurrentCheckouts) {
            peakConcurrentCheckouts = concurrentCheckouts;
          }
          await new Promise((resolve) => setTimeout(resolve, 5));
          concurrentCheckouts -= 1;
          return [];
        },
      },
    };

    const repo = new AnalyticsRepositoryImpl(trackingDataSource);
    const result = await repo.getTrends(
      { type: "WORKSPACE", organizationId: "org-test-1" },
      { from: new Date("2026-10-01"), to: new Date("2026-10-18"), interval: "day" },
    );

    assert.equal(
      peakConcurrentCheckouts,
      1,
      "getTrends must not check out multiple connections simultaneously",
    );
    assert.ok(Array.isArray(result.usage));
    assert.ok(Array.isArray(result.conversations));
    assert.ok(Array.isArray(result.activeUsers));
  });

  it("PHASE 3: Rejects invalid or unsupported trend intervals with HTTP 400 AppError", async () => {
    const service = new AnalyticsService({});
    await assert.rejects(
      async () => {
        service.resolveInterval("century");
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.errorCode, "INVALID_ANALYTICS_INTERVAL");
        return true;
      },
    );
  });

  it("PHASE 3: Rejects invalid date ranges with HTTP 400 AppError", async () => {
    const service = new AnalyticsService({});
    await assert.rejects(
      async () => {
        service.resolveDateRange({ from: "2026-10-20", to: "2026-10-10" });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.errorCode, "INVALID_ANALYTICS_DATE_RANGE");
        return true;
      },
    );
  });

  it("PHASE 3: Enforces organization-level isolation", async () => {
    let queriedOrgId = null;

    const mockDataSource = {
      manager: {
        query: async (sql, params) => {
          if (params && params[0]) {
            queriedOrgId = params[0];
          }
          return [{}];
        },
      },
    };

    const repo = new AnalyticsRepositoryImpl(mockDataSource);
    await repo.getOverview({
      type: "WORKSPACE",
      organizationId: "target-workspace-org-id",
    });

    assert.equal(queriedOrgId, "target-workspace-org-id", "SQL query must strictly isolate to target organization ID");
  });

  it("PHASE 4: Handles 10 concurrent requests cleanly under small pool budget", async () => {
    const mockDataSource = {
      manager: {
        query: async () => {
          // Simulate fast non-blocking queries
          await new Promise((r) => setTimeout(r, 2));
          return [
            {
              projects: 1,
              agents: 1,
              conversations: 5,
              messages: 20,
              activeUsers: 2,
              requests: 10,
              inputTokens: 500,
              outputTokens: 100,
              totalTokens: 600,
              averageResponseTimeMs: 300,
            },
          ];
        },
      },
    };

    const repo = new AnalyticsRepositoryImpl(mockDataSource);
    const service = new AnalyticsService(repo);
    const useCase = new GetAnalyticsOverviewUseCase(service);

    // Fire 10 concurrent requests
    const promises = Array.from({ length: 10 }, (_, i) =>
      useCase.execute({ type: "WORKSPACE", organizationId: `org-${i}` }),
    );

    const results = await Promise.all(promises);
    assert.equal(results.length, 10);
    assert.equal(results[0].projects, 1);
  });

  it("PHASE 5: Translates PostgreSQL 53300 connection exhaustion to HTTP 503 DATABASE_UNAVAILABLE", () => {
    const error53300 = new Error("remaining connection slots are reserved for roles with the SUPERUSER attribute");
    error53300.code = "53300";

    let statusCode = null;
    let jsonResponse = null;

    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonResponse = data;
        return res;
      },
    };

    const req = { requestId: "req-exhaustion-test", originalUrl: "/api/v1/analytics/overview" };

    errorMiddleware(error53300, req, res, () => {});

    assert.equal(statusCode, 503, "PostgreSQL 53300 error must respond with 503 Service Unavailable");
    assert.equal(jsonResponse?.error?.code, "DATABASE_UNAVAILABLE");
  });
});

