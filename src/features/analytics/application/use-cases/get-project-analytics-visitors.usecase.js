import { parseDateRange } from "../utils/date-range.util.js";

export class GetProjectAnalyticsVisitorsUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId, from, to, period, page = 1, limit = 20, search = "" }) {
    const range = parseDateRange({ from, to, period });

    const result = await this.projectAnalyticsRepository.getVisitors(
      projectId,
      {
        ...range,
        page,
        limit,
        search,
      },
    );

    return {
      range: {
        from: range.from,
        to: range.to,
      },
      ...result,
    };
  }
}

