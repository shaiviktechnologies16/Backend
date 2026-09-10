export class Upload {
  constructor({
    id = null,
    purpose,
    uploadedBy,
    organizationId = null,
    projectId = null,
    originalName = null,
    mimeType = null,
    size = null,
    storageProvider = null,
    storageKey = null,
    storageUrl = null,
    sourceUrl = null,
    status = "PENDING",
    metadata = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.purpose = purpose;
    this.uploadedBy = uploadedBy;
    this.organizationId = organizationId;
    this.projectId = projectId;
    this.originalName = originalName;
    this.mimeType = mimeType;
    this.size = size;
    this.storageProvider = storageProvider;
    this.storageKey = storageKey;
    this.storageUrl = storageUrl;
    this.sourceUrl = sourceUrl;
    this.status = status;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
