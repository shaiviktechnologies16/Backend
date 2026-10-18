import { parseDateRange } from "../utils/date-range.util.js";

export class GetProjectAnalyticsLandingPagesUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId, from, to, period, limit = 10 }) {
    const range = parseDateRange({ from, to, period });

    const landingPages = await this.projectAnalyticsRepository.getLandingPages(
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
      landingPages,
    };
  }
}

