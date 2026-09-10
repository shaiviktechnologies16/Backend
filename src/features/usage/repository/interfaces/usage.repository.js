export class UsageRepository {
  async create(usage, manager = null) {
    throw new Error("Method not implemented.");
  }

  async countByConversationId(conversationId, manager = null) {
    throw new Error("Method not implemented.");
  }

  async countByVisitorIdAndDateRange(
    visitorId,
    startDate,
    endDate,
    manager = null,
  ) {
    throw new Error("Method not implemented.");
  }

  async findByAgentId(agentId, options = {}, manager = null) {
    throw new Error("Method not implemented.");
  }

  async getAgentSummary(agentId, startDate = null, endDate = null) {
    throw new Error("Method not implemented.");
  }

  async getAgentTimeSeries(agentId, startDate = null, endDate = null) {
    throw new Error("Method not implemented.");
  }
}
