export class UpdatePlanUsageLimitUseCase {
  constructor(planRepository) {
    this.planRepository = planRepository;
  }

  async execute(planId, data = {}) {
    if (!planId) {
      throw new Error("Plan ID is required.");
    }

    const plan = await this.planRepository.findById(planId);

    if (!plan) {
      throw new Error("Plan not found.");
    }

    const fields = [
      "maxProjects",
      "maxAgents",
      "maxKnowledgeBases",
      "maxKnowledgeDocuments",
      "monthlyAiCredits",
      "maxTeamMembers",
      "maxWhatsappConnections",
      "voiceAiMinutes",
      "requestsPerDay",
      "requestsPerMonth",
      "tokensPerDay",
      "tokensPerMonth",
      "conversationsPerDay",
      "conversationsPerMonth",
      "uniqueVisitorsPerDay",
      "uniqueVisitorsPerMonth",
      "messagesPerVisitorPerDay",
      "messagesPerVisitorPerMonth",
    ];

    const limits = {};

    for (const field of fields) {
      if (data[field] === undefined) {
        continue;
      }

      if (data[field] === null) {
        limits[field] = null;
        continue;
      }

      const value = Number(data[field]);

      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`${field} must be a non-negative integer.`);
      }

      limits[field] = value;
    }

    return this.planRepository.updateUsageLimit(planId, limits);
  }
}
