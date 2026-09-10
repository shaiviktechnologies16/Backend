import { In } from "typeorm";
import { ProjectRepository } from "../../domain/repositories/project.repository.js";
import { ProjectEntity } from "../../domain/entities/project.entity.js";
import { ProjectOrmEntity } from "../database/project.orm-entity.js";

export class ProjectRepositoryImpl extends ProjectRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository(ProjectOrmEntity);
  }

  async create(project) {
    const entity = this.repository.create(project);

    const saved = await this.repository.save(entity);

    return new ProjectEntity(saved);
  }

  async findById(id) {
    const entity = await this.repository.findOne({
      where: {
        id,
      },
      relations: {
        organization: true,
        createdByUser: true,
      },
    });

    return entity ? new ProjectEntity(entity) : null;
  }

  async findByIds(ids) {
    if (!ids.length) {
      return [];
    }

    const entities = await this.repository.find({
      where: {
        id: In(ids),
      },
      relations: {
        organization: true,
        createdByUser: true,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return entities.map((entity) => new ProjectEntity(entity));
  }

  async findAll() {
    const entities = await this.repository.find({
      relations: {
        organization: true,
        createdByUser: true,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return entities.map((entity) => new ProjectEntity(entity));
  }

  async findByOrganizationId(organizationId) {
    const entities = await this.repository.find({
      where: {
        organizationId,
      },
      relations: {
        organization: true,
        createdByUser: true,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return entities.map((entity) => new ProjectEntity(entity));
  }
  async findByName(organizationId, name) {
    const entity = await this.repository.findOne({
      where: {
        organizationId,
        name,
      },
      relations: {
        organization: true,
        createdByUser: true,
      },
    });

    return entity ? new ProjectEntity(entity) : null;
  }

  async findByUserId(userId) {
    const entities = await this.repository.find({
      where: {
        createdBy: userId,
      },
      relations: {
        organization: true,
        createdByUser: true,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return entities.map((entity) => new ProjectEntity(entity));
  }

  async countByOrganization(organizationId) {
    return await this.repository.count({
      where: { organizationId },
    });
  }

  async update(project) {
    await this.repository.update(project.id, {
      name: project.name,
      description: project.description,
      status: project.status,
    });
    return this.findById(project.id);
  }

  async delete(id) {
    await this.repository.softDelete(id);
    return true;
  }
}
