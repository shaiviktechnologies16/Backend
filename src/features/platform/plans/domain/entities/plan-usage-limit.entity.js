export class PlanUsageLimit {
  constructor({
    id = null,
    planId,
    maxProjects = null,
    maxAgents = null,
    maxKnowledgeBases = null,
    maxKnowledgeDocuments = null,
    monthlyAiCredits = null,
    maxTeamMembers = null,
    maxWhatsappConnections = null,
    voiceAiMinutes = null,
    requestsPerDay = null,
    requestsPerMonth = null,
    tokensPerDay = null,
    tokensPerMonth = null,
    conversationsPerDay = null,
    conversationsPerMonth = null,
    uniqueVisitorsPerDay = null,
    uniqueVisitorsPerMonth = null,
    messagesPerVisitorPerDay = null,
    messagesPerVisitorPerMonth = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.planId = planId;
    this.maxProjects = maxProjects;
    this.maxAgents = maxAgents;
    this.maxKnowledgeBases = maxKnowledgeBases;
    this.maxKnowledgeDocuments = maxKnowledgeDocuments;
    this.monthlyAiCredits = monthlyAiCredits;
    this.maxTeamMembers = maxTeamMembers;
    this.maxWhatsappConnections = maxWhatsappConnections;
    this.voiceAiMinutes = voiceAiMinutes;
    this.requestsPerDay = requestsPerDay;
    this.requestsPerMonth = requestsPerMonth;
    this.tokensPerDay = tokensPerDay;
    this.tokensPerMonth = tokensPerMonth;
    this.conversationsPerDay = conversationsPerDay;
    this.conversationsPerMonth = conversationsPerMonth;
    this.uniqueVisitorsPerDay = uniqueVisitorsPerDay;
    this.uniqueVisitorsPerMonth = uniqueVisitorsPerMonth;
    this.messagesPerVisitorPerDay = messagesPerVisitorPerDay;
    this.messagesPerVisitorPerMonth = messagesPerVisitorPerMonth;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
