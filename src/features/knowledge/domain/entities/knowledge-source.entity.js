export class KnowledgeSource {
  constructor({
    id = null,
    projectId,
    name,
    type,
    sourceUrl = null,
    filePath = null,
    content = null,
    status = "PENDING",
    metadata = null,
    createdAt = null,
    updatedAt = null,
    deletedAt = null,
  }) {
    this.id = id;
    this.projectId = projectId;
    this.name = name;
    this.type = type;
    this.sourceUrl = sourceUrl;
    this.filePath = filePath;
    this.content = content;
    this.status = status;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.deletedAt = deletedAt;
  }
}
