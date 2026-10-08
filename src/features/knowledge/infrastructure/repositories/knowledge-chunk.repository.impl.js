import { KnowledgeChunkRepository } from "../../domain/repositories/knowledge-chunk.repository.js";
import { KnowledgeChunk } from "../../domain/entities/knowledge-chunk.entity.js";
import { KnowledgeChunkOrmEntity } from "../database/knowledge-chunk.orm-entity.js";

export class KnowledgeChunkRepositoryImpl extends KnowledgeChunkRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository(KnowledgeChunkOrmEntity);
  }

  getRepository(manager = null) {
    return manager
      ? manager.getRepository(KnowledgeChunkOrmEntity)
      : this.repository;
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new KnowledgeChunk({
      id: entity.id,
      knowledgeSourceId: entity.knowledgeSourceId,
      projectId: entity.projectId,
      content: entity.content,
      chunkIndex: entity.chunkIndex,
      metadata: entity.metadata,
      embedding: entity.embedding,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async createMany(chunks, manager = null) {
    if (!chunks.length) {
      return [];
    }

    const repository = this.getRepository(manager);

    const entities = chunks.map((chunk) =>
      repository.create({
        knowledgeSourceId: chunk.knowledgeSourceId,
        projectId: chunk.projectId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        metadata: chunk.metadata,
        embedding: chunk.embedding,
      }),
    );

    const saved = await repository.save(entities);

    return saved.map((entity) => this.toDomain(entity));
  }

  async findByKnowledgeSourceId(knowledgeSourceId, manager = null) {
    const repository = this.getRepository(manager);

    const entities = await repository.find({
      where: {
        knowledgeSourceId,
      },
      order: {
        chunkIndex: "ASC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async searchSimilar({
    projectId,
    embedding,
    limit = 5,
    similarityThreshold,
    manager = null,
  }) {
    const repository = this.getRepository(manager);

    const rows = await repository.query(
      `
        SELECT
          kc.id,
          kc.knowledge_source_id AS "knowledgeSourceId",
          ks.name AS "knowledgeSourceName",
          kc.project_id AS "projectId",
          kc.content,
          kc.chunk_index AS "chunkIndex",
          kc.metadata,
          kc.created_at AS "createdAt",
          kc.updated_at AS "updatedAt",
          1 - (kc.embedding <=> $1::vector) AS similarity
        FROM knowledge_chunks kc
        INNER JOIN knowledge_sources ks
          ON ks.id = kc.knowledge_source_id
        WHERE kc.project_id = $2
          AND kc.embedding IS NOT NULL
          AND 1 - (kc.embedding <=> $1::vector) >= $4
        ORDER BY kc.embedding <=> $1::vector
        LIMIT $3
      `,
      [JSON.stringify(embedding), projectId, limit, similarityThreshold],
    );

    return rows;
  }

  async searchFullText({ projectId, query, limit = 5, manager = null }) {
    if (!query?.trim()) return [];
    const repository = this.getRepository(manager);

    const rows = await repository.query(
      `
        SELECT
          kc.id,
          kc.knowledge_source_id AS "knowledgeSourceId",
          ks.name AS "knowledgeSourceName",
          kc.project_id AS "projectId",
          kc.content,
          kc.chunk_index AS "chunkIndex",
          kc.metadata,
          kc.created_at AS "createdAt",
          kc.updated_at AS "updatedAt",
          ts_rank_cd(to_tsvector('english', kc.content), websearch_to_tsquery('english', $1)) AS text_rank
        FROM knowledge_chunks kc
        INNER JOIN knowledge_sources ks
          ON ks.id = kc.knowledge_source_id
        WHERE kc.project_id = $2
          AND to_tsvector('english', kc.content) @@ websearch_to_tsquery('english', $1)
        ORDER BY text_rank DESC
        LIMIT $3
      `,
      [query.trim(), projectId, limit],
    );

    return rows;
  }

  async searchHybrid({
    projectId,
    embedding,
    query,
    limit = 5,
    similarityThreshold = 0.3,
    rrfK = 60,
    manager = null,
  }) {
    const fetchLimit = limit * 2;

    const [vectorResults, textResults] = await Promise.all([
      embedding
        ? this.searchSimilar({
            projectId,
            embedding,
            limit: fetchLimit,
            similarityThreshold,
            manager,
          })
        : Promise.resolve([]),
      query
        ? this.searchFullText({
            projectId,
            query,
            limit: fetchLimit,
            manager,
          }).catch(() => [])
        : Promise.resolve([]),
    ]);

    const rrfScores = new Map();
    const itemMap = new Map();

    vectorResults.forEach((item, index) => {
      const rank = index + 1;
      const score = 1 / (rrfK + rank);
      rrfScores.set(item.id, (rrfScores.get(item.id) || 0) + score);
      if (!itemMap.has(item.id)) {
        itemMap.set(item.id, { ...item, rrfScore: 0 });
      }
    });

    textResults.forEach((item, index) => {
      const rank = index + 1;
      const score = 1 / (rrfK + rank);
      rrfScores.set(item.id, (rrfScores.get(item.id) || 0) + score);
      if (!itemMap.has(item.id)) {
        itemMap.set(item.id, { ...item, rrfScore: 0 });
      }
    });

    const fusedResults = Array.from(rrfScores.entries()).map(([id, score]) => {
      const item = itemMap.get(id);
      item.rrfScore = score;
      return item;
    });

    fusedResults.sort((a, b) => b.rrfScore - a.rrfScore);

    return fusedResults.slice(0, limit);
  }

  async deleteByKnowledgeSourceId(knowledgeSourceId, manager = null) {
    const repository = this.getRepository(manager);

    await repository.delete({
      knowledgeSourceId,
    });
  }
}
