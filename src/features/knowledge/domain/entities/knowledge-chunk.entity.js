export class KnowledgeChunk {
  constructor({
    id = null,
    knowledgeSourceId,
    projectId,
    content,
    chunkIndex,
    metadata = null,
    embedding = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.knowledgeSourceId = knowledgeSourceId;
    this.projectId = projectId;
    this.content = content;
    this.chunkIndex = chunkIndex;
    this.metadata = metadata;
    this.embedding = embedding;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
