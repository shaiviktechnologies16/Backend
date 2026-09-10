export class Lead {
  constructor({
    id = null,
    organizationId,
    projectId,
    agentId,
    conversationId = null,
    visitorId = null,
    name = null,
    phone = null,
    email = null,
    requirement = null,
    source,
    status,
    metadata = {},
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.projectId = projectId;
    this.agentId = agentId;
    this.conversationId = conversationId;
    this.visitorId = visitorId;
    this.name = name;
    this.phone = phone;
    this.email = email;
    this.requirement = requirement;
    this.source = source;
    this.status = status;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
