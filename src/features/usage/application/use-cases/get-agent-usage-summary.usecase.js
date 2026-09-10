export class GetAgentUsageSummaryUseCase {
  constructor({ usageRepository }) {
    this.usageRepository = usageRepository;
  }

  async execute({ agentId, startDate = null, endDate = null }) {
    return this.usageRepository.getAgentSummary(agentId, startDate, endDate);
  }
}
