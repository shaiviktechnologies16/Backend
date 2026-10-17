import { parseDateRange } from "../utils/date-range.util.js";

export class GetProjectAnalyticsOverviewUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId, from, to, period, timezone }) {
    const range = parseDateRange({ from, to, period, timezone });

    const overview = await this.projectAnalyticsRepository.getOverview(
      projectId,
      range,
    );

    return {
      range: {
        from: range.from,
        to: range.to,
      },
      metrics: overview,
    };
  }
}

