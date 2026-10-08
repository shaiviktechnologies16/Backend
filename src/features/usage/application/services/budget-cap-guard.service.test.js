import test from "node:test";
import assert from "node:assert/strict";
import { BudgetCapGuardService } from "./budget-cap-guard.service.js";

test("BudgetCapGuardService allows requests when spending is within daily limit", async () => {
  const mockUsageRepo = {
    async getDailySpendingUsd() {
      return 1.5;
    },
    async getMonthlySpendingUsd() {
      return 10.0;
    },
  };

  const mockSettingsRepo = {
    async findByOrganizationId() {
      return { dailyBudgetUsd: 5.0, monthlyBudgetUsd: 50.0 };
    },
  };

  const guard = new BudgetCapGuardService({
    usageRepository: mockUsageRepo,
    workspaceSettingsRepository: mockSettingsRepo,
  });

  // Should pass without throwing error
  await guard.checkBudgetCap("org-123");
  assert.ok(true);
});

test("BudgetCapGuardService throws BUDGET_CAP_EXCEEDED when daily budget cap is reached", async () => {
  const mockUsageRepo = {
    async getDailySpendingUsd() {
      return 5.5;
    },
    async getMonthlySpendingUsd() {
      return 10.0;
    },
  };

  const mockSettingsRepo = {
    async findByOrganizationId() {
      return { dailyBudgetUsd: 5.0, monthlyBudgetUsd: 50.0 };
    },
  };

  const guard = new BudgetCapGuardService({
    usageRepository: mockUsageRepo,
    workspaceSettingsRepository: mockSettingsRepo,
  });

  await assert.rejects(
    async () => {
      await guard.checkBudgetCap("org-123");
    },
    {
      errorCode: "BUDGET_CAP_EXCEEDED",
      statusCode: 429,
    },
  );
});
