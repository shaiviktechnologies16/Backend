export class ProjectEntity {
  constructor({
    id,
    organizationId,
    name,
    description = null,
    status,
    createdBy,
    organization = null,
    createdByUser = null,
    createdAt,
    updatedAt,
    deletedAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;

    this.name = name;
    this.description = description;

    this.status = status;

    this.createdBy = createdBy;

    this.organization = organization
      ? {
          id: organization.id,
          name: organization.name,
        }
      : null;

    this.owner = createdByUser
      ? {
          id: createdByUser.id,
          name: createdByUser.name,
          email: createdByUser.email,
        }
      : null;

    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.deletedAt = deletedAt;
  }
}
