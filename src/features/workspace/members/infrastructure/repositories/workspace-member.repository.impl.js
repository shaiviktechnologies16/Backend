import { WorkspaceMemberRepository } from "../../domain/repositories/workspace-member.repository.js";
import { WorkspaceMemberEntity } from "../../domain/entities/workspace-member.entity.js";
import { WorkspaceMemberOrmEntity } from "../database/workspace-member.orm-entity.js";
import { OrganizationRole } from "../../../../organization/domain/constants/organization-role.js";

export class WorkspaceMemberRepositoryImpl extends WorkspaceMemberRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository(WorkspaceMemberOrmEntity);
  }

  getRepository(manager = null) {
    return manager
      ? manager.getRepository(WorkspaceMemberOrmEntity)
      : this.repository;
  }

  async findAllByOrganizationId(organizationId, manager = null) {
    const repository = this.getRepository(manager);

    const members = await repository
      .createQueryBuilder("member")
      .leftJoin("users", "user", "user.id = member.user_id")
      .select([
        "member.id AS id",
        "member.organization_id AS organizationId",
        "member.user_id AS userId",
        "member.role AS role",
        "member.status AS status",
        "member.joined_at AS joinedAt",
        "member.created_at AS createdAt",
        "member.updated_at AS updatedAt",
        "user.name AS userName",
        "user.email AS userEmail",
      ])
      .where("member.organization_id = :organizationId", {
        organizationId,
      })
      .orderBy("member.created_at", "ASC")
      .getRawMany();

    return members.map(
      (member) =>
        new WorkspaceMemberEntity({
          id: member.id,
          organizationId: member.organizationid,
          userId: member.userid,
          role: member.role,
          name: member.username,
          email: member.useremail,
          joinedAt: member.joinedat,
          createdAt: member.createdat,
          updatedAt: member.updatedat,
          status: member.status,
          isActive: member.status === "ACTIVE",
        }),
    );
  }

  async findById(id, manager = null) {
    const repository = this.getRepository(manager);

    const member = await repository.findOne({
      where: {
        id,
      },
    });

    return member ? new WorkspaceMemberEntity(member) : null;
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

    return member ? new WorkspaceMemberEntity(member) : null;
  }

  async findOwnerByOrganizationId(organizationId, manager = null) {
    const repository = this.getRepository(manager);

    const member = await repository.findOne({
      where: {
        organizationId,
        role: OrganizationRole.OWNER,
        status: "ACTIVE",
      },
    });

    return member ? new WorkspaceMemberEntity(member) : null;
  }

  async findByIdIncludingRemoved(id, manager = null) {
    const repository = this.getRepository(manager);

    const member = await repository.findOne({
      where: {
        id,
      },
    });

    return member ? new WorkspaceMemberEntity(member) : null;
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

    return member ? new WorkspaceMemberEntity(member) : null;
  }

  async updateRole(id, role, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(id, {
      role,
      updatedAt: new Date(),
    });

    return this.findById(id, manager);
  }

  async updateStatus(id, status, manager = null) {
    const repository = this.getRepository(manager);

    const result = await repository.update(
      { id },
      {
        status,
        updatedAt: new Date(),
      },
    );

    if (!result.affected) {
      throw new Error(`Workspace member status was not updated: ${id}`);
    }

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

  async restore(id, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(id, {
      status: "ACTIVE",
      removedAt: null,
      joinedAt: new Date(),
      updatedAt: new Date(),
    });

    return this.findById(id, manager);
  }
}
