import { AgentVisibility } from "../constants/agent-visibility.js";

export class Agent {
  constructor({
    id = null,
    userId,
    projectId,
    project = null,
    aiModelId,
    aiModel = null,
    name,
    description = null,
    systemPrompt = "",
    provider,
    model,
    temperature,
    maxTokens,
    isDefault = false,
    visibility,
    publicKey = null,
    publicEnabledAt = null,
    widgetConfig = {},
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.userId = userId;
    this.projectId = projectId;

    this.project = project
      ? {
          id: project.id,
          name: project.name,
          organizationId: project.organizationId ?? null,
        }
      : null;

    this.aiModelId = aiModelId;
    this.aiModel = aiModel;

    this.name = name;
    this.description = description;
    this.systemPrompt = systemPrompt;

    this.provider = provider;
    this.model = model;

    this.temperature = temperature;
    this.maxTokens = maxTokens;

    this.isDefault = isDefault;

    this.visibility = visibility;
    this.publicKey = publicKey;
    this.publicEnabledAt = publicEnabledAt;

    this.widgetConfig = widgetConfig;

    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  enablePublic(publicKey) {
    this.visibility = AgentVisibility.PUBLIC;

    if (!this.publicKey) {
      this.publicKey = publicKey;
    }

    this.publicEnabledAt = new Date();
  }

  disablePublic() {
    this.visibility = AgentVisibility.PRIVATE;
    this.publicEnabledAt = null;
  }

  update({
    name,
    description,
    systemPrompt,
    temperature,
    maxTokens,
    widgetConfig,
    aiModelId,
    provider,
    model,
    aiModel,
  }) {
    if (name !== undefined) {
      this.name = name;
    }

    if (description !== undefined) {
      this.description = description;
    }

    if (systemPrompt !== undefined) {
      this.systemPrompt = systemPrompt;
    }

    if (temperature !== undefined) {
      this.temperature = temperature;
    }

    if (maxTokens !== undefined) {
      this.maxTokens = maxTokens;
    }

    if (widgetConfig !== undefined) {
      this.widgetConfig = widgetConfig;
    }

    if (aiModelId !== undefined) {
      this.aiModelId = aiModelId;
    }

    if (provider !== undefined) {
      this.provider = provider;
    }

    if (model !== undefined) {
      this.model = model;
    }

    if (aiModel !== undefined) {
      this.aiModel = aiModel;
    }
  }
}
