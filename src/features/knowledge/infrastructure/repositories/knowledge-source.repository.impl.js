import { KnowledgeSourceRepository } from "../../domain/repositories/knowledge-source.repository.js";
import { KnowledgeSource } from "../../domain/entities/knowledge-source.entity.js";
import { KnowledgeSourceOrmEntity } from "../database/knowledge-source.orm-entity.js";

export class KnowledgeSourceRepositoryImpl extends KnowledgeSourceRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository(KnowledgeSourceOrmEntity);
  }

  getRepository(manager = null) {
    return manager
      ? manager.getRepository(KnowledgeSourceOrmEntity)
      : this.repository;
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new KnowledgeSource({
      id: entity.id,
      projectId: entity.projectId,
      name: entity.name,
      type: entity.type,
      sourceUrl: entity.sourceUrl,
      filePath: entity.filePath,
      content: entity.content,
      status: entity.status,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
    });
  }

  async create(source, manager = null) {
    const repository = this.getRepository(manager);

    const entity = repository.create({
      projectId: source.projectId,
      name: source.name,
      type: source.type,
      sourceUrl: source.sourceUrl,
      filePath: source.filePath,
      content: source.content,
      status: source.status,
      metadata: source.metadata,
    });

    const saved = await repository.save(entity);

    return this.toDomain(saved);
  }

  async findById(id, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: {
        id,
      },
    });

    return this.toDomain(entity);
  }

  async findByProjectId(projectId, manager = null) {
    const repository = this.getRepository(manager);

    const entities = await repository.find({
      where: {
        projectId,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async update(source, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(source.id, {
      name: source.name,
      type: source.type,
      sourceUrl: source.sourceUrl,
      filePath: source.filePath,
      content: source.content,
      status: source.status,
      metadata: source.metadata,
    });

    return this.findById(source.id, manager);
  }

  async delete(id, manager = null) {
    const repository = this.getRepository(manager);

    await repository.delete(id);
  }
}
