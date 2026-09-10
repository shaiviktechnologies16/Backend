export class OrganizationModelAccess {
  constructor({
    id,
    organizationId,
    aiModelId,
    aiModel,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.aiModelId = aiModelId;
    this.aiModel = aiModel;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
