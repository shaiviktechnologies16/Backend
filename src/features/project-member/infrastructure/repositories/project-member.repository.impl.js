import { ProjectMemberRepository } from "../../domain/repositories/project-member.repository.js";
import { ProjectMember } from "../../domain/entities/project-member.entity.js";
import { ProjectMemberRole } from "../../domain/constants/project-member-role.js";

export class ProjectMemberRepositoryImpl extends ProjectMemberRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository("ProjectMember");
  }

  toDomain(entity) {
    if (!entity) return null;

    return new ProjectMember({
      id: entity.id,
      name: entity.user?.name,
      email: entity.user?.email,
      projectId: entity.projectId,
      userId: entity.userId,
      role: entity.role,
      status: entity.status,
      removedAt: entity.removedAt,
      createdAt: entity.createdAt,
    });
  }

  async create(member) {
    const entity = this.repository.create({
      projectId: member.projectId,
      userId: member.userId,
      role: member.role,
    });

    const saved = await this.repository.save(entity);

    return this.toDomain(saved);
  }

  async findById(id) {
    const entity = await this.repository.findOne({
      where: {
        id,
        status: "ACTIVE",
      },
    });

    return this.toDomain(entity);
  }

  async findByProjectAndUser(projectId, userId) {
    const entity = await this.repository.findOne({
      where: {
        projectId,
        userId,
        status: "ACTIVE",
      },
    });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findOwnerByProjectId(projectId) {
    const entity = await this.repository.findOne({
      where: {
        projectId,
        role: ProjectMemberRole.OWNER,
      },
    });

    return this.toDomain(entity);
  }

  async findAllByProject(projectId) {
    const entities = await this.repository.find({
      where: {
        projectId,
        status: "ACTIVE",
      },
      relations: {
        user: true,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findAllByUser(userId) {
    const entities = await this.repository.find({
      where: {
        userId,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async update(member) {
    await this.repository.save({
      id: member.id,
      role: member.role,
    });

    return this.findById(member.id);
  }

  async delete(id) {
    await this.repository.update(id, {
      status: "REMOVED",
      removedAt: new Date(),
    });
  }
  async findByIdIncludeRemoved(id) {
    const entity = await this.repository.findOne({
      where: {
        id,
      },
    });

    return this.toDomain(entity);
  }
  async restore(id) {
    await this.repository.update(id, {
      status: "ACTIVE",
      removedAt: null,
    });

    return this.findById(id);
  }
}
