import { OrganizationFeatureAccessRepository } from "../../domain/repositories/organization-feature-access.repository.js";
import { OrganizationFeatureAccess } from "../../domain/entities/organization-feature-access.entity.js";

export class OrganizationFeatureAccessRepositoryImpl extends OrganizationFeatureAccessRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository("OrganizationFeatureAccess");
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new OrganizationFeatureAccess({
      id: entity.id,
      organizationId: entity.organizationId,
      feature: entity.feature,
      enabled: entity.enabled,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async findByOrganizationId(organizationId) {
    const entities = await this.repository.find({
      where: {
        organizationId,
      },
      order: {
        createdAt: "ASC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findOne(organizationId, feature) {
    const entity = await this.repository.findOne({
      where: {
        organizationId,
        feature,
      },
    });

    return this.toDomain(entity);
  }

  async isEnabled(organizationId, feature) {
    const entity = await this.repository.findOne({
      where: {
        organizationId,
        feature,
        enabled: true,
      },
    });

    return !!entity;
  }

  async upsert(organizationId, feature, enabled) {
    const existing = await this.repository.findOne({
      where: {
        organizationId,
        feature,
      },
    });

    if (existing) {
      existing.enabled = enabled;

      const saved = await this.repository.save(existing);

      return this.toDomain(saved);
    }

    const entity = this.repository.create({
      organizationId,
      feature,
      enabled,
    });

    const saved = await this.repository.save(entity);

    return this.toDomain(saved);
  }
}
