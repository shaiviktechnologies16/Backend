import { WorkspaceApiKeyRepository } from "../../domain/repositories/workspace-api-key.repository.js";
import { WorkspaceApiKey } from "../../domain/entities/workspace-api-key.entity.js";
import { WorkspaceApiKeyOrmEntity } from "../database/workspace-api-key.orm-entity.js";

export class WorkspaceApiKeyRepositoryImpl extends WorkspaceApiKeyRepository {
  constructor(dataSource) {
    super();

    this.dataSource = dataSource;
    this.repository = dataSource.getRepository(WorkspaceApiKeyOrmEntity);
  }

  getRepository(manager = null) {
    return manager
      ? manager.getRepository(WorkspaceApiKeyOrmEntity)
      : this.repository;
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new WorkspaceApiKey({
      id: entity.id,
      organizationId: entity.organizationId,
      name: entity.name,
      description: entity.description,
      encryptedValue: entity.encryptedValue,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(apiKey, manager = null) {
    const repository = this.getRepository(manager);

    const entity = repository.create({
      organizationId: apiKey.organizationId,
      name: apiKey.name,
      description: apiKey.description,
      encryptedValue: apiKey.encryptedValue,
      createdBy: apiKey.createdBy,
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

  async findByOrganizationId(organizationId, manager = null) {
    const repository = this.getRepository(manager);

    const entities = await repository.find({
      where: {
        organizationId,
      },
      order: {
        createdAt: "ASC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async update(apiKey, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.preload({
      id: apiKey.id,
      organizationId: apiKey.organizationId,
      name: apiKey.name,
      description: apiKey.description,
      encryptedValue: apiKey.encryptedValue,
      createdBy: apiKey.createdBy,
    });

    if (!entity) {
      return null;
    }

    const saved = await repository.save(entity);

    return this.toDomain(saved);
  }

  async delete(id, manager = null) {
    const repository = this.getRepository(manager);

    await repository.delete({
      id,
    });
  }
}
