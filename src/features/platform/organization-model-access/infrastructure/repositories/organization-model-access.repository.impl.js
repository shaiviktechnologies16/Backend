import { OrganizationModelAccessRepository } from "../../domain/repositories/organization-model-access.repository.js";
import { OrganizationModelAccess } from "../../domain/entities/organization-model-access.entity.js";

export class OrganizationModelAccessRepositoryImpl extends OrganizationModelAccessRepository {
  constructor(dataSource) {
    super();
    this.repository = dataSource.getRepository("OrganizationModelAccess");
  }

  toDomain(entity) {
    if (!entity) return null;

    return new OrganizationModelAccess({
      id: entity.id,
      organizationId: entity.organizationId,
      aiModelId: entity.aiModelId,

      aiModel: entity.aiModel
        ? {
            id: entity.aiModel.id,
            provider: entity.aiModel.provider,
            model: entity.aiModel.model,
            capability: entity.aiModel.capability,
            displayName: entity.aiModel.displayName,
            description: entity.aiModel.description,
            status: entity.aiModel.status,
          }
        : null,

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toPersistence(access) {
    return {
      id: access.id,
      organizationId: access.organizationId,
      aiModelId: access.aiModelId,
    };
  }

  async findByOrganizationId(organizationId) {
    const entities = await this.repository.find({
      where: {
        organizationId,
      },
      relations: {
        aiModel: true,
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findOne(organizationId, aiModelId) {
    const entity = await this.repository.findOne({
      where: {
        organizationId,
        aiModelId,
      },
      relations: {
        aiModel: true,
      },
    });

    return this.toDomain(entity);
  }

  async create(access) {
    const entity = this.repository.create(this.toPersistence(access));

    const saved = await this.repository.save(entity);

    const result = await this.repository.findOne({
      where: {
        id: saved.id,
      },
      relations: {
        aiModel: true,
      },
    });

    return this.toDomain(result);
  }

  async delete(organizationId, aiModelId) {
    await this.repository.delete({
      organizationId,
      aiModelId,
    });
  }
}
