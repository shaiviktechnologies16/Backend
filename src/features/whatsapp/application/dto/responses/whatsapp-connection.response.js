export class WhatsappConnectionResponse {
  constructor(connection) {
    this.id = connection.id;
    this.organizationId = connection.organizationId;

    this.name = connection.name;
    this.provider = connection.provider;

    this.phoneNumber = connection.phoneNumber;
    this.phoneNumberId = connection.phoneNumberId;
    this.businessAccountId = connection.businessAccountId;

    this.status = connection.status;
    this.qualityRating = connection.qualityRating;

    this.projectId = connection.projectId;
    this.agentId = connection.agentId;

    this.metadata = connection.metadata;
    this.lastConnectedAt = connection.lastConnectedAt;

    this.createdAt = connection.createdAt;
    this.updatedAt = connection.updatedAt;
  }
}
