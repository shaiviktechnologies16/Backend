export class PlatformWhatsappConnection {
  constructor({
    id = null,
    name,
    provider,
    phoneNumber = null,
    status = "PENDING",
    qualityRating = null,
    credentials = null,
    metadata = {},
    lastConnectedAt = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.name = name;
    this.provider = provider;
    this.phoneNumber = phoneNumber;
    this.status = status;
    this.qualityRating = qualityRating;
    this.credentials = credentials;
    this.metadata = metadata;
    this.lastConnectedAt = lastConnectedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
