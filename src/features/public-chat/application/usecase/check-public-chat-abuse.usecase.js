import { AppError } from "../../../../common/errors/AppError.js";

export class CheckPublicChatAbuseUseCase {
  constructor({ publicChatAbuseRepository, checkPlanUsageUseCase }) {
    this.publicChatAbuseRepository = publicChatAbuseRepository;
    this.checkPlanUsageUseCase = checkPlanUsageUseCase;
  }

  async execute({ organizationId, visitorId, ipHash }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    if (!visitorId) {
      throw new AppError("Visitor ID is required.", 400, "VISITOR_ID_REQUIRED");
    }

    if (!ipHash) {
      throw new AppError(
        "Unable to identify client.",
        400,
        "CLIENT_ID_REQUIRED",
      );
    }

    const planUsage = await this.checkPlanUsageUseCase.execute({
      organizationId,
      visitorId,
    });

    const dailyVisitorLimit = planUsage.limits.messagesPerVisitorPerDay;

    const visitorDailyMessages = planUsage.usage.visitor.dailyMessages;

    const result = await this.publicChatAbuseRepository.checkAndConsume({
      organizationId,
      visitorId,
      ipHash,
      dailyVisitorLimit,
      visitorDailyMessages,
    });

    if (result.rateLimitExceeded) {
      throw new AppError(
        "Too many requests. Please try again shortly.",
        429,
        "PUBLIC_CHAT_RATE_LIMIT_EXCEEDED",
      );
    }

    if (result.dailyLimitExceeded) {
      const error = new AppError(
        "You've reached your daily chat limit. Please come back tomorrow to continue chatting.",
        429,
        "DAILY_VISITOR_MESSAGE_LIMIT_EXCEEDED",
      );
      error.isUsageLimit = true;
      error.usage = {
        organization: {
          used: planUsage.usage.daily.requests,
          limit: planUsage.limits.requestsPerDay,
          remaining: planUsage.usage.daily.requestsRemaining,
        },
        visitor: {
          used: dailyVisitorLimit,
          limit: dailyVisitorLimit,
          remaining: 0,
        },
      };
      throw error;
    }

    return {
      allowed: true,
      rateLimit: {
        remaining: result.rateLimitRemaining,
      },
      daily: {
        remaining: result.dailyRemaining,
      },
    };
  }
}
