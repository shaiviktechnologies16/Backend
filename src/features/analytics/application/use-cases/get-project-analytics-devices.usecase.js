import { parseDateRange } from "../utils/date-range.util.js";

export class GetProjectAnalyticsDevicesUseCase {
  constructor({ projectAnalyticsRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
  }

  async execute({ projectId, from, to, period }) {
    const range = parseDateRange({ from, to, period });

    const breakdown = await this.projectAnalyticsRepository.getDeviceBreakdown(
      projectId,
      range,
    );

    return {
      range: {
        from: range.from,
        to: range.to,
      },
      ...breakdown,
    };
  }
}

