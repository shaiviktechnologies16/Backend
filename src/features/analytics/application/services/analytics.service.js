import { AppError } from "../../../../common/errors/AppError.js";

export class AnalyticsService {
  constructor(analyticsRepository) {
    this.analyticsRepository = analyticsRepository;
  }

  resolveScope({ type, organizationId }) {
    if (type === "PLATFORM") {
      return {
        type: "PLATFORM",
      };
    }

    if (type === "WORKSPACE") {
      if (!organizationId) {
        throw new Error("Organization ID is required for workspace analytics.");
      }

      return {
        type: "WORKSPACE",
        organizationId,
      };
    }

    throw new Error("Invalid analytics scope.");
  }

  resolveDateRange({ from, to }) {
    const end = to ? new Date(to) : new Date();

    const start = from
      ? new Date(from)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(start.getTime())) {
      throw new Error("Invalid analytics 'from' date.");
    }

    if (Number.isNaN(end.getTime())) {
      throw new Error("Invalid analytics 'to' date.");
    }

    if (start >= end) {
      throw new Error("Analytics 'from' date must be before 'to' date.");
    }

    return {
      from: start,
      to: end,
    };
  }

  resolveInterval(interval) {
    const allowedIntervals = ["hour", "day", "week", "month"];

    if (!interval) {
      return "day";
    }

    if (!allowedIntervals.includes(interval)) {
      throw new AppError(
        `Invalid analytics interval. Allowed values: ${allowedIntervals.join(", ")}.`,
        400,
        "INVALID_ANALYTICS_INTERVAL",
      );
    }

    return interval;
  }

  resolveLimit(limit) {
    if (limit === undefined || limit === null || limit === "") {
      return 10;
    }

    const parsedLimit = Number(limit);

    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      throw new Error("Analytics limit must be a positive integer.");
    }

    return Math.min(parsedLimit, 100);
  }

  async getOverview(scopeInput) {
    const scope = this.resolveScope(scopeInput);

    return this.analyticsRepository.getOverview(scope);
  }

  async getTrends(scopeInput, options = {}) {
    const scope = this.resolveScope(scopeInput);

    const { from, to } = this.resolveDateRange(options);

    const interval = this.resolveInterval(options.interval);

    return this.analyticsRepository.getTrends(scope, {
      from,
      to,
      interval,
    });
  }

  async getAgentUsage(scopeInput, options = {}) {
    const scope = this.resolveScope(scopeInput);

    const { from, to } = this.resolveDateRange(options);

    const limit = this.resolveLimit(options.limit);

    return this.analyticsRepository.getAgentUsage(scope, {
      from,
      to,
      limit,
    });
  }

  async getProjectActivity(scopeInput, options = {}) {
    const scope = this.resolveScope(scopeInput);

    const { from, to } = this.resolveDateRange(options);

    const limit = this.resolveLimit(options.limit);

    return this.analyticsRepository.getProjectActivity(scope, {
      from,
      to,
      limit,
    });
  }
}
