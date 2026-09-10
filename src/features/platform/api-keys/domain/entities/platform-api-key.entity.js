export class PlatformApiKey {
  constructor({
    id,
    provider,
    name,
    description = null,
    encryptedValue,
    isActive = true,
    createdBy,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.provider = provider;
    this.name = name;
    this.description = description;
    this.encryptedValue = encryptedValue;
    this.isActive = isActive;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
