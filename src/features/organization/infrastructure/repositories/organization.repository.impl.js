import { In } from "typeorm";

import { OrganizationRepository } from "../../domain/repositories/organization.repository.js";
import { OrganizationEntity } from "../../domain/entities/organization.entity.js";
import { OrganizationOrmEntity } from "../database/organization.orm-entity.js";

export class OrganizationRepositoryImpl extends OrganizationRepository {
  constructor(dataSource) {
    super();

    this.dataSource = dataSource;
    this.repository = dataSource.getRepository(OrganizationOrmEntity);
  }

  getRepository(manager = null) {
    return manager
      ? manager.getRepository(OrganizationOrmEntity)
      : this.repository;
  }

  async create(organization, manager = null) {
    const repository = this.getRepository(manager);
    const ormEntity = repository.create(organization);
    const saved = await repository.save(ormEntity);
    return new OrganizationEntity(saved);
  }

  async findBasicById(id, manager = null) {
    const repository = this.getRepository(manager);

    const organization = await repository.findOne({
      select: {
        id: true,
        name: true,
      },
      where: {
        id,
      },
    });

    return organization ? new OrganizationEntity(organization) : null;
  }

  async findAllWithCounts(manager = null) {
    const repository = this.getRepository(manager);

    const organizations = await repository
      .createQueryBuilder("organization")
      .leftJoin(
        "organization_members",
        "members",
        "members.organization_id = organization.id",
      )
      .leftJoin(
        "projects",
        "projects",
        "projects.organization_id = organization.id AND projects.deleted_at IS NULL",
      )
      .leftJoin("users", "owner", "owner.id = organization.owner_id")
      .select([
        "organization.id",
        "organization.name",
        "organization.slug",
        "organization.ownerId",
        "organization.description",
        "organization.logo",
        "organization.website",
        "organization.status",
        "organization.createdAt",
        "owner.id",
        "owner.name",
        "owner.email",
      ])
      .addSelect("COUNT(DISTINCT members.id)", "memberCount")
      .addSelect("COUNT(DISTINCT projects.id)", "projectCount")
      .groupBy("organization.id")
      .addGroupBy("organization.name")
      .addGroupBy("organization.slug")
      .addGroupBy("organization.ownerId")
      .addGroupBy("organization.description")
      .addGroupBy("organization.logo")
      .addGroupBy("organization.website")
      .addGroupBy("organization.status")
      .addGroupBy("organization.createdAt")
      .addGroupBy("owner.id")
      .addGroupBy("owner.name")
      .addGroupBy("owner.email")
      .orderBy("organization.createdAt", "DESC")
      .getRawMany();

    return organizations.map((organization) => ({
      id: organization.organization_id,
      name: organization.organization_name,
      slug: organization.organization_slug,

      owner: {
        id: organization.organization_owner_id,
        name: organization.owner_name,
        email: organization.owner_email,
      },

      description: organization.organization_description,
      logo: organization.organization_logo,
      website: organization.organization_website,
      status: organization.organization_status,
      createdAt: organization.organization_created_at,

      memberCount: Number(organization.memberCount),
      projectCount: Number(organization.projectCount),
    }));
  }

  async findAll(manager = null) {
    const repository = this.getRepository(manager);

    const organizations = await repository.find({
      relations: {
        plan: true,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return organizations.map(
      (organization) => new OrganizationEntity(organization),
    );
  }

  async findById(id, manager = null) {
    const repository = this.getRepository(manager);

    const organization = await repository
      .createQueryBuilder("organization")
      .leftJoin(
        "organization_members",
        "members",
        "members.organization_id = organization.id",
      )
      .leftJoin(
        "projects",
        "projects",
        "projects.organization_id = organization.id AND projects.deleted_at IS NULL",
      )
      .leftJoin("users", "owner", "owner.id = organization.owner_id")
      .leftJoin("plans", "plan", "plan.id = organization.plan_id")
      .select([
        "organization.id",
        "organization.name",
        "organization.slug",
        "organization.ownerId",
        "organization.planId",
        "organization.description",
        "organization.logo",
        "organization.website",
        "organization.status",
        "organization.createdAt",
        "organization.updatedAt",

        "owner.id",
        "owner.name",
        "owner.email",

        "plan.id",
        "plan.name",
        "plan.code",
      ])
      .addSelect("COUNT(DISTINCT members.id)", "memberCount")
      .addSelect("COUNT(DISTINCT projects.id)", "projectCount")
      .where("organization.id = :id", { id })
      .groupBy("organization.id")
      .addGroupBy("owner.id")
      .addGroupBy("plan.id")
      .getRawAndEntities();

    const entity = organization.entities[0];

    if (!entity) {
      return null;
    }

    const raw = organization.raw[0];

    entity.memberCount = Number(raw.memberCount ?? 0);
    entity.projectCount = Number(raw.projectCount ?? 0);

    entity.plan = raw.plan_id
      ? {
          id: raw.plan_id,
          name: raw.plan_name,
          code: raw.plan_code,
        }
      : null;

    return entity;
  }

  async findByIds(ids, manager = null) {
    if (!ids.length) {
      return [];
    }

    const repository = this.getRepository(manager);

    const organizations = await repository.find({
      where: {
        id: In(ids),
      },
    });

    return organizations.map(
      (organization) => new OrganizationEntity(organization),
    );
  }
  async findByOwnerId(ownerId, manager = null) {
    const repository = this.getRepository(manager);

    const organizations = await repository.find({
      where: {
        ownerId,
      },
    });

    return organizations.map(
      (organization) => new OrganizationEntity(organization),
    );
  }

  async findBySlug(slug, manager = null) {
    const repository = this.getRepository(manager);

    const organization = await repository.findOne({
      where: {
        slug,
      },
    });

    return organization ? new OrganizationEntity(organization) : null;
  }

  async update(id, organization, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(id, organization);

    return this.findById(id, manager);
  }

  async updateOwner(organizationId, ownerId, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(organizationId, {
      ownerId,
    });

    return this.findById(organizationId, manager);
  }

  async delete(id, manager = null) {
    const repository = this.getRepository(manager);

    await repository.softDelete(id);
  }
}
