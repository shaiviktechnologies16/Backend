export class PlatformConfigEntity {
  constructor({
    id,
    configKey,
    configValue,
    isSecret = false,
    description = null,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.configKey = configKey;
    this.configValue = configValue;
    this.isSecret = isSecret;
    this.description = description;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
