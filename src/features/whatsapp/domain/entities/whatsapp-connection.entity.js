export class WhatsappConnection {
  constructor({
    id = null,
    organizationId,
    name,
    provider,
    phoneNumber = null,
    phoneNumberId = null,
    businessAccountId = null,
    status,
    qualityRating = null,
    projectId = null,
    agentId = null,
    credentials = null,
    metadata = {},
    lastConnectedAt = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.provider = provider;
    this.phoneNumber = phoneNumber;
    this.phoneNumberId = phoneNumberId;
    this.businessAccountId = businessAccountId;
    this.status = status;
    this.qualityRating = qualityRating;
    this.projectId = projectId;
    this.agentId = agentId;
    this.credentials = credentials;
    this.metadata = metadata;
    this.lastConnectedAt = lastConnectedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
