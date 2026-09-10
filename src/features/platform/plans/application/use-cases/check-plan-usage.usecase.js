import { AppError } from "../../../../../common/errors/AppError.js";

export class CheckPlanUsageUseCase {
  constructor({ planRepository }) {
    this.planRepository = planRepository;
  }

  async execute({ organizationId, visitorId = null }) {
    const planResult =
      await this.planRepository.findOrganizationPlanWithLimits(organizationId);

    if (!planResult?.plan) {
      throw new AppError(
        "Organization does not have a plan assigned.",
        403,
        "PLAN_NOT_ASSIGNED",
      );
    }

    if (this.planRepository.dataSource) {
      const subRes = await this.planRepository.dataSource.query(
        "SELECT status, current_period_end FROM subscriptions WHERE organization_id = $1 LIMIT 1",
        [organizationId],
      );
      const sub = subRes?.[0];
      if (
        sub?.status === "EXPIRED" ||
        (sub?.current_period_end &&
          new Date(sub.current_period_end) < new Date())
      ) {
        throw new AppError(
          "Your subscription plan has expired. Please renew your subscription to continue using AI services.",
          403,
          "SUBSCRIPTION_EXPIRED",
        );
      }
    }

    const { plan, limits } = planResult;

    if (!limits) {
      throw new AppError(
        "Usage limits are not configured for this plan.",
        500,
        "PLAN_USAGE_LIMIT_NOT_CONFIGURED",
      );
    }

    const now = new Date();
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

    const istNow = new Date(now.getTime() + IST_OFFSET_MS);

    const dayStartIST = new Date(istNow);
    dayStartIST.setUTCHours(0, 0, 0, 0);

    const monthStartIST = new Date(istNow);
    monthStartIST.setUTCDate(1);
    monthStartIST.setUTCHours(0, 0, 0, 0);

    const dayStart = new Date(dayStartIST.getTime() - IST_OFFSET_MS);

    const monthStart = new Date(monthStartIST.getTime() - IST_OFFSET_MS);

    const usageOverview = await this.planRepository.getUsageOverview({
      organizationId,
      visitorId,
      dayStart,
      monthStart,
    });

    const {
      dailyUsage,
      monthlyUsage,
      dailyConversations,
      monthlyConversations,
      dailyUniqueVisitors,
      monthlyUniqueVisitors,
      dailyVisitorMessages,
      monthlyVisitorMessages,
    } = usageOverview;

    const visitorAlreadyExistsToday =
      visitorId !== null && dailyVisitorMessages > 0;

    const visitorAlreadyExistsThisMonth =
      visitorId !== null && monthlyVisitorMessages > 0;

    const requestsRemaining =
      limits.requestsPerDay === null
        ? null
        : Math.max(0, limits.requestsPerDay - dailyUsage.requests);

    const monthlyRequestsRemaining =
      limits.requestsPerMonth === null
        ? null
        : Math.max(0, limits.requestsPerMonth - monthlyUsage.requests);

    const requestLimitWarning =
      limits.requestsPerDay !== null &&
      requestsRemaining > 0 &&
      requestsRemaining <= Math.ceil(limits.requestsPerDay * 0.2);

    const monthlyRequestLimitWarning =
      limits.requestsPerMonth !== null &&
      monthlyRequestsRemaining > 0 &&
      monthlyRequestsRemaining <= Math.ceil(limits.requestsPerMonth * 0.2);

    /*
     * Unique visitor limits
     */

    if (
      visitorId &&
      !visitorAlreadyExistsToday &&
      limits.uniqueVisitorsPerDay !== null &&
      limits.uniqueVisitorsPerDay > 0 &&
      dailyUniqueVisitors >= limits.uniqueVisitorsPerDay
    ) {
      throw new AppError(
        "Daily visitor limit has been reached.",
        429,
        "DAILY_UNIQUE_VISITOR_LIMIT_EXCEEDED",
      );
    }

    if (
      visitorId &&
      !visitorAlreadyExistsThisMonth &&
      limits.uniqueVisitorsPerMonth !== null &&
      limits.uniqueVisitorsPerMonth > 0 &&
      monthlyUniqueVisitors >= limits.uniqueVisitorsPerMonth
    ) {
      throw new AppError(
        "Monthly visitor limit has been reached.",
        429,
        "MONTHLY_UNIQUE_VISITOR_LIMIT_EXCEEDED",
      );
    }

    /*
     * Per-visitor message limits
     */

    if (
      visitorId &&
      limits.messagesPerVisitorPerDay !== null &&
      limits.messagesPerVisitorPerDay > 0 &&
      dailyVisitorMessages >= limits.messagesPerVisitorPerDay
    ) {
      throw new AppError(
        "You've reached your daily chat limit. Please come back tomorrow to continue chatting.",
        429,
        "DAILY_VISITOR_MESSAGE_LIMIT_EXCEEDED",
      );
    }

    if (
      visitorId &&
      limits.messagesPerVisitorPerMonth !== null &&
      limits.messagesPerVisitorPerMonth > 0 &&
      monthlyVisitorMessages >= limits.messagesPerVisitorPerMonth
    ) {
      throw new AppError(
        "You've reached your monthly chat limit. Please come back next month to continue chatting.",
        429,
        "MONTHLY_VISITOR_MESSAGE_LIMIT_EXCEEDED",
      );
    }

    /*
     * Request limits
     */

    if (
      limits.requestsPerDay !== null &&
      dailyUsage.requests >= limits.requestsPerDay
    ) {
      throw new AppError(
        "You've reached today's chat limit. Please come back tomorrow to continue chatting.",
        429,
        "DAILY_REQUEST_LIMIT_EXCEEDED",
      );
    }

    if (
      limits.requestsPerMonth !== null &&
      monthlyUsage.requests >= limits.requestsPerMonth
    ) {
      throw new AppError(
        `Monthly request limit of ${limits.requestsPerMonth} has been reached.`,
        429,
        "MONTHLY_REQUEST_LIMIT_EXCEEDED",
      );
    }

    /*
     * Token limits
     */

    if (
      limits.tokensPerDay !== null &&
      limits.tokensPerDay > 0 &&
      dailyUsage.tokens >= limits.tokensPerDay
    ) {
      throw new AppError(
        "Daily token limit exceeded.",
        429,
        "DAILY_TOKEN_LIMIT_EXCEEDED",
      );
    }

    if (
      limits.tokensPerMonth !== null &&
      limits.tokensPerMonth > 0 &&
      monthlyUsage.tokens >= limits.tokensPerMonth
    ) {
      throw new AppError(
        "Monthly token limit exceeded.",
        429,
        "MONTHLY_TOKEN_LIMIT_EXCEEDED",
      );
    }

    /*
     * Conversation limits
     */

    if (
      limits.conversationsPerDay !== null &&
      dailyConversations >= limits.conversationsPerDay
    ) {
      throw new AppError(
        "Daily conversation limit exceeded.",
        429,
        "DAILY_CONVERSATION_LIMIT_EXCEEDED",
      );
    }

    if (
      limits.conversationsPerMonth !== null &&
      monthlyConversations >= limits.conversationsPerMonth
    ) {
      throw new AppError(
        "Monthly conversation limit exceeded.",
        429,
        "MONTHLY_CONVERSATION_LIMIT_EXCEEDED",
      );
    }

    return {
      allowed: true,

      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code,
      },

      limits: {
        requestsPerDay: limits.requestsPerDay,
        requestsPerMonth: limits.requestsPerMonth,

        tokensPerDay: limits.tokensPerDay,
        tokensPerMonth: limits.tokensPerMonth,

        conversationsPerDay: limits.conversationsPerDay,
        conversationsPerMonth: limits.conversationsPerMonth,

        uniqueVisitorsPerDay: limits.uniqueVisitorsPerDay,
        uniqueVisitorsPerMonth: limits.uniqueVisitorsPerMonth,

        messagesPerVisitorPerDay: limits.messagesPerVisitorPerDay,
        messagesPerVisitorPerMonth: limits.messagesPerVisitorPerMonth,
      },

      usage: {
        daily: {
          requests: dailyUsage.requests,
          requestsLimit: limits.requestsPerDay,
          requestsRemaining,
          requestLimitWarning,

          tokens: dailyUsage.tokens,
          conversations: dailyConversations,
          uniqueVisitors: dailyUniqueVisitors,
        },

        monthly: {
          requests: monthlyUsage.requests,
          requestsLimit: limits.requestsPerMonth,
          requestsRemaining: monthlyRequestsRemaining,
          requestLimitWarning: monthlyRequestLimitWarning,

          tokens: monthlyUsage.tokens,
          conversations: monthlyConversations,
          uniqueVisitors: monthlyUniqueVisitors,
        },

        visitor: {
          visitorId,
          dailyMessages: dailyVisitorMessages,
          monthlyMessages: monthlyVisitorMessages,
        },
      },
    };
  }
}
