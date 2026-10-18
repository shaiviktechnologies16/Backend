import { parseDateRange } from "../utils/date-range.util.js";

export class GetProjectAnalyticsCampaignsUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId, from, to, period, limit = 10 }) {
    const range = parseDateRange({ from, to, period });

    const campaigns = await this.projectAnalyticsRepository.getCampaigns(
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
      campaigns,
    };
  }
}

