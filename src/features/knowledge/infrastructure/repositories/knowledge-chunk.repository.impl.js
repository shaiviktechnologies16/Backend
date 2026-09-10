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

  async deleteByKnowledgeSourceId(knowledgeSourceId, manager = null) {
    const repository = this.getRepository(manager);

    await repository.delete({
      knowledgeSourceId,
    });
  }
}
