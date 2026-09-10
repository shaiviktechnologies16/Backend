import { AISettingsRepository } from "../../domain/repositories/ai-settings.repository.js";
import { AISettings } from "../../domain/entities/ai-settings.entity.js";

export class AISettingsRepositoryImpl extends AISettingsRepository {
  constructor(dataSource) {
    super();
    this.repository = dataSource.getRepository("AISettings");
  }

  toDomain(entity) {
    if (!entity) return null;

    return new AISettings({
      id: entity.id,
      organizationId: entity.organizationId,
      defaultInstructions: entity.defaultInstructions,
      conversationRules: entity.conversationRules,
      tone: entity.tone,
      responseStyle: entity.responseStyle,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toPersistence(settings) {
    return {
      id: settings.id,
      organizationId: settings.organizationId,
      defaultInstructions: settings.defaultInstructions,
      conversationRules: settings.conversationRules,
      tone: settings.tone,
      responseStyle: settings.responseStyle,
    };
  }

  async findByOrganizationId(organizationId) {
    const entity = await this.repository.findOne({
      where: {
        organizationId,
      },
    });

    return this.toDomain(entity);
  }

  async create(settings) {
    const entity = this.repository.create(this.toPersistence(settings));

    const saved = await this.repository.save(entity);

    return this.toDomain(saved);
  }

  async update(settings) {
    const entity = await this.repository.findOne({
      where: {
        id: settings.id,
      },
    });

    if (!entity) {
      return null;
    }

    Object.assign(entity, this.toPersistence(settings));

    const saved = await this.repository.save(entity);

    return this.toDomain(saved);
  }
}
