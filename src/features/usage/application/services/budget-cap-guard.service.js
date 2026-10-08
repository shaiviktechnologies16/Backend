import { AppError } from "../../../../common/errors/AppError.js";

export class BudgetCapGuardService {
  constructor({ usageRepository, workspaceSettingsRepository }) {
    this.usageRepository = usageRepository;
    this.workspaceSettingsRepository = workspaceSettingsRepository;
  }

  async checkBudgetCap(organizationId) {
    if (!organizationId || !this.workspaceSettingsRepository) return;

    const settings = await this.workspaceSettingsRepository
      .findByOrganizationId(organizationId)
      .catch(() => null);

    if (!settings) return;

    const dailyLimit = Number(settings.dailyBudgetUsd);
    const monthlyLimit = Number(settings.monthlyBudgetUsd);

    const hasDailyCap = Number.isFinite(dailyLimit) && dailyLimit > 0;
    const hasMonthlyCap = Number.isFinite(monthlyLimit) && monthlyLimit > 0;

    if (!hasDailyCap && !hasMonthlyCap) return;

    if (
      hasDailyCap &&
      typeof this.usageRepository.getDailySpendingUsd === "function"
    ) {
      const todaySpent =
        await this.usageRepository.getDailySpendingUsd(organizationId);

      if (todaySpent >= dailyLimit) {
        throw new AppError(
          `Organization daily AI budget cap ($${dailyLimit.toFixed(2)}) reached. Today's spend: $${todaySpent.toFixed(2)}.`,
          429,
          "BUDGET_CAP_EXCEEDED",
        );
      }
    }

    if (
      hasMonthlyCap &&
      typeof this.usageRepository.getMonthlySpendingUsd === "function"
    ) {
      const monthSpent =
        await this.usageRepository.getMonthlySpendingUsd(organizationId);

      if (monthSpent >= monthlyLimit) {
        throw new AppError(
          `Organization monthly AI budget cap ($${monthlyLimit.toFixed(2)}) reached. Month's spend: $${monthSpent.toFixed(2)}.`,
          429,
          "BUDGET_CAP_EXCEEDED",
        );
      }
    }
  }
}
