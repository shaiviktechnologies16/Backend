import { OrganizationMemberRepository } from "../../domain/repositories/organization-member.repository.js";
import { OrganizationMemberEntity } from "../../domain/entities/organization-member.entity.js";
import { OrganizationMemberOrmEntity } from "../database/organization-member.orm-entity.js";

export class OrganizationMemberRepositoryImpl extends OrganizationMemberRepository {
  constructor(dataSource) {
    super();

    this.dataSource = dataSource;
    this.repository = dataSource.getRepository(OrganizationMemberOrmEntity);
  }

  getRepository(manager = null) {
    return manager
      ? manager.getRepository(OrganizationMemberOrmEntity)
      : this.repository;
  }

  async create(member, manager = null) {
    const repository = this.getRepository(manager);

    const ormEntity = repository.create(member);
    const saved = await repository.save(ormEntity);

    return new OrganizationMemberEntity(saved);
  }

  async findById(id, manager = null) {
    const repository = this.getRepository(manager);

    const member = await repository.findOne({
      where: {
        id,
        status: "ACTIVE",
      },
    });

    return member ? new OrganizationMemberEntity(member) : null;
  }

  async findByUserId(userId, manager = null) {
    const repository = this.getRepository(manager);

    const member = await repository.findOne({
      where: {
        userId,
      },
    });

    return member ? new OrganizationMemberEntity(member) : null;
  }

  async findAllByUser(userId, manager = null) {
    const repository = this.getRepository(manager);

    const members = await repository.find({
      where: {
        userId,
        status: "ACTIVE",
      },
      order: {
        joinedAt: "ASC",
      },
    });

    return members.map((member) => new OrganizationMemberEntity(member));
  }
  async findByOrganizationAndUser(organizationId, userId, manager = null) {
    const repository = this.getRepository(manager);

    const member = await repository.findOne({
      where: {
        organizationId,
        userId,
        status: "ACTIVE",
      },
    });

    return member ? new OrganizationMemberEntity(member) : null;
  }

  async findByOrganizationAndUserIncludingRemoved(
    organizationId,
    userId,
    manager = null,
  ) {
    const repository = this.getRepository(manager);

    const member = await repository.findOne({
      where: {
        organizationId,
        userId,
      },
    });

    return member ? new OrganizationMemberEntity(member) : null;
  }

  async findAllByOrganization(organizationId, manager = null) {
    const repository = this.getRepository(manager);

    const members = await repository.find({
      where: {
        organizationId,
        status: "ACTIVE",
      },
      relations: {
        user: true,
      },
      order: {
        joinedAt: "ASC",
      },
    });

    return members.map((member) => ({
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      fullName: member.user?.name ?? null,
      email: member.user?.email ?? null,
      role: member.role,
      joinedAt: member.joinedAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    }));
  }

  async findOwnerByOrganizationId(organizationId, manager = null) {
    const repository = this.getRepository(manager);

    const member = await repository.findOne({
      where: {
        organizationId,
        role: "OWNER",
        status: "ACTIVE",
      },
      relations: {
        user: true,
      },
    });

    if (!member) {
      return null;
    }

    return {
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role,
      user: member.user
        ? {
            id: member.user.id,
            name: member.user.name,
            email: member.user.email,
            phone: member.user.phone,
          }
        : null,
    };
  }

  async countByOrganization(organizationId, manager = null) {
    const repository = this.getRepository(manager);

    return repository.count({
      where: {
        organizationId,
        status: "ACTIVE",
      },
    });
  }

  async updateRole(id, role, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(id, {
      role,
      updatedAt: new Date(),
    });

    return this.findById(id, manager);
  }

  async remove(id, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(id, {
      status: "REMOVED",
      removedAt: new Date(),
      updatedAt: new Date(),
    });

    return true;
  }

  async restore(id, role, invitedBy, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(id, {
      role,
      invitedBy,
      status: "ACTIVE",
      removedAt: null,
      joinedAt: new Date(),
      updatedAt: new Date(),
    });

    return this.findById(id, manager);
  }
}
