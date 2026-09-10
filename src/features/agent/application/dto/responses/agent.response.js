export class AgentResponse {
  constructor(agent) {
    this.id = agent.id;
    this.userId = agent.userId;
    this.projectId = agent.projectId;

    this.project = agent.project
      ? {
          id: agent.project.id,
          name: agent.project.name,
        }
      : null;

    this.aiModelId = agent.aiModelId;

    this.aiModel = agent.aiModel
      ? {
          id: agent.aiModel.id,
          provider: agent.aiModel.provider,
          model: agent.aiModel.model,
          displayName: agent.aiModel.displayName,
          description: agent.aiModel.description,
          status: agent.aiModel.status,
        }
      : null;

    this.name = agent.name;
    this.description = agent.description;
    this.systemPrompt = agent.systemPrompt;
    this.temperature = agent.temperature;
    this.maxTokens = agent.maxTokens;
    this.isDefault = agent.isDefault;
    this.visibility = agent.visibility;
    this.publicKey = agent.publicKey;
    this.publicEnabledAt = agent.publicEnabledAt;
    this.widgetConfig = agent.widgetConfig;
    this.createdAt = agent.createdAt;
    this.updatedAt = agent.updatedAt;
  }
}
