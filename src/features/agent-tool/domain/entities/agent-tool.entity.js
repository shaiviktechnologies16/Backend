export class AgentTool {
  constructor({
    id = null,
    agentId,
    credentialId = null,
    name,
    description,
    type,
    configuration,
    enabled = true,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.agentId = agentId;
    this.credentialId = credentialId;
    this.name = name;
    this.description = description;
    this.type = type;
    this.configuration = configuration;
    this.enabled = enabled;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  update({ name, description, type, configuration, credentialId, enabled }) {
    if (name !== undefined) {
      this.name = name;
    }

    if (description !== undefined) {
      this.description = description;
    }

    if (type !== undefined) {
      this.type = type;
    }

    if (configuration !== undefined) {
      this.configuration = configuration;
    }

    if (credentialId !== undefined) {
      this.credentialId = credentialId;
    }

    if (enabled !== undefined) {
      this.enabled = enabled;
    }
  }
}
