export class AgentToolCredential {
  constructor({
    id = null,
    organizationId,
    name,
    type,
    encryptedValue,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.type = type;
    this.encryptedValue = encryptedValue;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  update({ name, type, encryptedValue }) {
    if (name !== undefined) {
      this.name = name;
    }

    if (type !== undefined) {
      this.type = type;
    }

    if (encryptedValue !== undefined) {
      this.encryptedValue = encryptedValue;
    }
  }
}
