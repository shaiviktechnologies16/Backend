import { parseDateRange } from "../utils/date-range.util.js";

export class GetProjectAnalyticsSourcesUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId, from, to, period, limit = 10 }) {
    const range = parseDateRange({ from, to, period });

    const sources = await this.projectAnalyticsRepository.getTrafficSources(
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
      sources,
    };
  }
}

