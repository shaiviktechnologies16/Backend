export class KnowledgeChunkRepository {
  async createMany(chunks, manager = null) {
    throw new Error("Not implemented");
  }

  async findByKnowledgeSourceId(knowledgeSourceId, manager = null) {
    throw new Error("Not implemented");
  }

  async searchSimilar({
    projectId,
    embedding,
    limit = 5,
    similarityThreshold,
    manager = null,
  }) {
    throw new Error("Not implemented");
  }

  async searchFullText({ projectId, query, limit = 5, manager = null }) {
    throw new Error("Not implemented");
  }

  async searchHybrid({
    projectId,
    embedding,
    query,
    limit = 5,
    similarityThreshold,
    rrfK = 60,
    manager = null,
  }) {
    throw new Error("Not implemented");
  }

  async deleteByKnowledgeSourceId(knowledgeSourceId, manager = null) {
    throw new Error("Not implemented");
  }
}
