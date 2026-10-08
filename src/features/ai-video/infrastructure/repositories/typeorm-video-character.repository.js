import { VideoCharacterRepository } from "../../domain/repositories/video-character.repository.js";
import { VideoCharacter } from "../../domain/entities/video-character.entity.js";
import { VideoCharacterOrmEntity } from "../database/video-character.orm-entity.js";

export class TypeOrmVideoCharacterRepository extends VideoCharacterRepository {
  constructor(dataSource) {
    super();
    this.repository = dataSource.getRepository(VideoCharacterOrmEntity);
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new VideoCharacter({
      id: entity.id,
      organizationId: entity.organizationId,
      createdById: entity.createdById,
      name: entity.name,
      description: entity.description,
      referenceImageUrl: entity.referenceImageUrl,
      style: entity.style,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(characterData) {
    const entity = this.repository.create({
      organizationId: characterData.organizationId,
      createdById: characterData.createdById,
      name: characterData.name,
      description: characterData.description || null,
      referenceImageUrl: characterData.referenceImageUrl || null,
      style: characterData.style || "cartoon",
      metadata: characterData.metadata || null,
    });

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id) {
    const entity = await this.repository.findOne({ where: { id } });
    return this.toDomain(entity);
  }

  async findByIdForOrganization(id, organizationId) {
    const entity = await this.repository.findOne({
      where: { id, organizationId },
    });
    return this.toDomain(entity);
  }

  async findAllByOrganization(organizationId, { limit = 50, offset = 0 } = {}) {
    const [entities, total] = await this.repository.findAndCount({
      where: { organizationId },
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });

    return {
      characters: entities.map((e) => this.toDomain(e)),
      total,
    };
  }

  async update(id, updateData) {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id) {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }

  async deleteForOrganization(id, organizationId) {
    const result = await this.repository.delete({ id, organizationId });
    return (result.affected || 0) > 0;
  }
}
