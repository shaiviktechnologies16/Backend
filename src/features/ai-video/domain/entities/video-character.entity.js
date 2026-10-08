export class VideoCharacter {
  constructor({
    id = null,
    organizationId,
    createdById,
    name,
    description = null,
    referenceImageUrl = null,
    style = "cartoon",
    metadata = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.createdById = createdById;
    this.name = name;
    this.description = description;
    this.referenceImageUrl = referenceImageUrl;
    this.style = style;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
