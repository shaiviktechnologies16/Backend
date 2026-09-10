import { PlatformApiKeyRepository } from "../../domain/repositories/platform-api-key.repository.js";
import { PlatformApiKey } from "../../domain/entities/platform-api-key.entity.js";
import { PlatformApiKeyOrmEntity } from "../database/platform-api-key.orm-entity.js";

export class PlatformApiKeyRepositoryImpl extends PlatformApiKeyRepository {
  constructor(dataSource) {
    super();

    this.dataSource = dataSource;
    this.repository = dataSource.getRepository(PlatformApiKeyOrmEntity);
  }

  getRepository(manager = null) {
    return manager
      ? manager.getRepository(PlatformApiKeyOrmEntity)
      : this.repository;
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new PlatformApiKey({
      id: entity.id,
      provider: entity.provider,
      name: entity.name,
      description: entity.description,
      encryptedValue: entity.encryptedValue,
      isActive: entity.isActive,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(apiKey, manager = null) {
    const repository = this.getRepository(manager);

    const entity = repository.create({
      provider: apiKey.provider,
      name: apiKey.name,
      description: apiKey.description,
      encryptedValue: apiKey.encryptedValue,
      isActive: apiKey.isActive,
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

  async findByProvider(provider, manager = null) {
    const repository = this.getRepository(manager);

    const entities = await repository.find({
      where: {
        provider,
      },
      order: {
        createdAt: "ASC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findAll(manager = null) {
    const repository = this.getRepository(manager);

    const entities = await repository.find({
      order: {
        provider: "ASC",
        createdAt: "ASC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async update(apiKey, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.preload({
      id: apiKey.id,
      provider: apiKey.provider,
      name: apiKey.name,
      description: apiKey.description,
      encryptedValue: apiKey.encryptedValue,
      isActive: apiKey.isActive,
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
