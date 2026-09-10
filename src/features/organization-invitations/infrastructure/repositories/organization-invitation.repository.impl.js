import { OrganizationInvitationEntity } from "../../domain/entities/organization-invitation.entity.js";
import { OrganizationInvitationRepository } from "../../domain/repositories/organization-invitation.repository.js";
import { OrganizationInvitationOrm } from "../../../../database/entities/organization-invitation.orm.js";
import { InvitationStatus } from "../../domain/constants/invitation-status.js";
import { OrganizationRole } from "../../../organization/domain/constants/organization-role.js";

export class OrganizationInvitationRepositoryImpl extends OrganizationInvitationRepository {
  constructor(dataSource) {
    super();

    this.dataSource = dataSource;
    this.repository = dataSource.getRepository(OrganizationInvitationOrm);
  }

  getRepository(manager = null) {
    return manager
      ? manager.getRepository(OrganizationInvitationOrm)
      : this.repository;
  }

  async create(invitation, manager = null) {
    const repository = this.getRepository(manager);

    const entity = repository.create({
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      createdBy: invitation.createdBy,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    });

    const savedEntity = await repository.save(entity);

    return this.toDomain(savedEntity);
  }

  async update(invitation, manager = null) {
    const repository = this.getRepository(manager);

    await repository.save({
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      createdBy: invitation.createdBy,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    });

    return this.findById(invitation.id, manager);
  }

  async findById(id, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: { id },
    });

    return entity ? this.toDomain(entity) : null;
  }

  async findByToken(token, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: { token },
    });

    return entity ? this.toDomain(entity) : null;
  }

  async findPendingByOrganizationAndEmail(
    organizationId,
    email,
    manager = null,
  ) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: {
        organizationId,
        email,
        status: InvitationStatus.PENDING,
      },
    });

    return entity ? this.toDomain(entity) : null;
  }

  async findPendingByEmail(email, manager = null) {
    const repository = this.getRepository(manager);

    const entities = await repository.find({
      where: {
        email,
        status: InvitationStatus.PENDING,
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findByTokenAndStatus(token, status, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: {
        token,
        status,
      },
    });

    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: {
        email,
        role: OrganizationRole.OWNER,
        status: InvitationStatus.PENDING,
      },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async markAccepted(id, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(id, {
      status: InvitationStatus.ACCEPTED,
      acceptedAt: new Date(),
      updatedAt: new Date(),
    });

    return this.findById(id, manager);
  }

  async revoke(id, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(id, {
      status: InvitationStatus.REVOKED,
      updatedAt: new Date(),
    });

    return this.findById(id, manager);
  }

  async delete(id, manager = null) {
    const repository = this.getRepository(manager);

    await repository.delete(id);
  }

  toDomain(entity) {
    return new OrganizationInvitationEntity({
      id: entity.id,
      organizationId: entity.organizationId,
      email: entity.email,
      role: entity.role,
      token: entity.token,
      status: entity.status,
      expiresAt: entity.expiresAt,
      acceptedAt: entity.acceptedAt,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
