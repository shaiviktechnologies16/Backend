import { parseDateRange } from "../utils/date-range.util.js";

export class GetProjectAnalyticsPagesUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId, from, to, period, limit = 10 }) {
    const range = parseDateRange({ from, to, period });

    const pages = await this.projectAnalyticsRepository.getPopularPages(
      projectId,
      {
        ...range,
        limit,
      },
    );

    return {
      range: {
        from: range.from,
        to: range.to,
      },
      pages,
    };
  }
}

