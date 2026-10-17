import { parseDateRange } from "../utils/date-range.util.js";

export class GetProjectAnalyticsTrendsUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId, from, to, period, timezone = "UTC" }) {
    const range = parseDateRange({ from, to, period, timezone });

    const trends = await this.projectAnalyticsRepository.getTrends(
      projectId,
      range,
    );

    return {
      range: {
        from: range.from,
        to: range.to,
      },
      trends,
    };
  }
}

