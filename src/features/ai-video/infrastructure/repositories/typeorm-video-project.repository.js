import { VideoProjectRepository } from "../../domain/repositories/video-project.repository.js";
import { VideoProject } from "../../domain/entities/video-project.entity.js";
import { VideoProjectOrmEntity } from "../database/video-project.orm-entity.js";

export class TypeOrmVideoProjectRepository extends VideoProjectRepository {
  constructor(dataSource) {
    super();
    this.repository = dataSource.getRepository(VideoProjectOrmEntity);
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new VideoProject({
      id: entity.id,
      organizationId: entity.organizationId,
      projectId: entity.projectId,
      createdById: entity.createdById,
      name: entity.name,
      prompt: entity.prompt,
      language: entity.language,
      aspectRatio: entity.aspectRatio,
      duration: entity.duration,
      style: entity.style,
      status: entity.status,
      script: entity.script,
      storyboard: entity.storyboard,
      finalVideoUrl: entity.finalVideoUrl,
      errorMessage: entity.errorMessage,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(projectData) {
    const entity = this.repository.create({
      organizationId: projectData.organizationId,
      projectId: projectData.projectId || null,
      createdById: projectData.createdById,
      name: projectData.name,
      prompt: projectData.prompt,
      language: projectData.language || "te",
      aspectRatio: projectData.aspectRatio || "9:16",
      duration: projectData.duration || 30,
      style: projectData.style || "cartoon",
      status: projectData.status || "DRAFT",
      script: projectData.script || null,
      storyboard: projectData.storyboard || null,
      finalVideoUrl: projectData.finalVideoUrl || null,
      errorMessage: projectData.errorMessage || null,
      metadata: projectData.metadata || null,
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

  async findAllByOrganization(organizationId, { limit = 20, offset = 0 } = {}) {
    const [entities, total] = await this.repository.findAndCount({
      where: { organizationId },
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });

    return {
      projects: entities.map((e) => this.toDomain(e)),
      total,
    };
  }

  async update(id, updateData) {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async updateStatus(id, status, extraPayload = {}) {
    await this.repository.update(id, {
      status,
      ...extraPayload,
    });
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
