import { AppError } from "../../../../common/errors/AppError.js";

export class GetTokenUsageAnalyticsUseCase {
  constructor({ usageRepository, workspaceSettingsRepository }) {
    this.usageRepository = usageRepository;
    this.workspaceSettingsRepository = workspaceSettingsRepository;
  }

  async execute({ organizationId, days = 30 }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    const [analytics, settings, todaySpent, monthSpent] = await Promise.all([
      this.usageRepository.getOrganizationTokenAnalytics(organizationId, days),
      this.workspaceSettingsRepository
        ? this.workspaceSettingsRepository
            .findByOrganizationId(organizationId)
            .catch(() => null)
        : Promise.resolve(null),
      typeof this.usageRepository.getDailySpendingUsd === "function"
        ? this.usageRepository.getDailySpendingUsd(organizationId)
        : Promise.resolve(0),
      typeof this.usageRepository.getMonthlySpendingUsd === "function"
        ? this.usageRepository.getMonthlySpendingUsd(organizationId)
        : Promise.resolve(0),
    ]);

    const dailyBudget = settings?.dailyBudgetUsd
      ? Number(settings.dailyBudgetUsd)
      : null;
    const monthlyBudget = settings?.monthlyBudgetUsd
      ? Number(settings.monthlyBudgetUsd)
      : null;

    return {
      ...analytics,
      budget: {
        dailyBudgetUsd: dailyBudget,
        dailySpentUsd: Number(todaySpent.toFixed(4)),
        dailyUsagePercentage: dailyBudget
          ? Number(((todaySpent / dailyBudget) * 100).toFixed(1))
          : null,
        isDailyExceeded: dailyBudget ? todaySpent >= dailyBudget : false,
        monthlyBudgetUsd: monthlyBudget,
        monthlySpentUsd: Number(monthSpent.toFixed(4)),
        monthlyUsagePercentage: monthlyBudget
          ? Number(((monthSpent / monthlyBudget) * 100).toFixed(1))
          : null,
        isMonthlyExceeded: monthlyBudget ? monthSpent >= monthlyBudget : false,
      },
    };
  }
}
