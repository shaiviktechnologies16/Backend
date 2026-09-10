export class WorkspaceApiKey {
  constructor({
    id = null,
    organizationId,
    name,
    description = null,
    encryptedValue,
    createdBy,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.encryptedValue = encryptedValue;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  update({ name, description, encryptedValue }) {
    if (name !== undefined) {
      this.name = name;
    }

    if (description !== undefined) {
      this.description = description;
    }

    if (encryptedValue !== undefined) {
      this.encryptedValue = encryptedValue;
    }
  }
}
