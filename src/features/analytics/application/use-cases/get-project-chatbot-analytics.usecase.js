import { parseDateRange } from "../utils/date-range.util.js";

export class GetProjectChatbotAnalyticsUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId, from, to, period, timezone = "UTC" }) {
    const range = parseDateRange({ from, to, period, timezone });

    const data = await this.projectAnalyticsRepository.getChatbotAnalytics(
      projectId,
      range,
    );

    return {
      range: {
        from: range.from,
        to: range.to,
      },
      ...data,
    };
  }
}

