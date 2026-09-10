import { LeadRepository } from "../../domain/repositories/lead.repository.js";
import { Lead } from "../../domain/entities/lead.entity.js";
import { LeadOrmEntity } from "../database/lead.orm-entity.js";

export class LeadRepositoryImpl extends LeadRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository(LeadOrmEntity);
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new Lead({
      id: entity.id,
      organizationId: entity.organizationId,
      projectId: entity.projectId,
      agentId: entity.agentId,
      conversationId: entity.conversationId,
      visitorId: entity.visitorId,
      name: entity.name,
      phone: entity.phone,
      email: entity.email,
      requirement: entity.requirement,
      source: entity.source,
      status: entity.status,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(lead) {
    const entity = this.repository.create({
      organizationId: lead.organizationId,
      projectId: lead.projectId,
      agentId: lead.agentId,
      conversationId: lead.conversationId,
      visitorId: lead.visitorId,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      requirement: lead.requirement,
      source: lead.source,
      status: lead.status,
      metadata: lead.metadata,
    });

    const saved = await this.repository.save(entity);

    return this.toDomain(saved);
  }

  async findById(id) {
    const entity = await this.repository.findOne({
      where: { id },
    });

    return this.toDomain(entity);
  }

  async findByOrganizationId(organizationId, options = {}) {
    const {
      page = 1,
      limit = 20,
      projectId = null,
      status = null,
      source = null,
    } = options;

    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const where = {
      organizationId,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    if (source) {
      where.source = source;
    }

    const [entities, total] = await this.repository.findAndCount({
      where,
      order: {
        createdAt: "DESC",
      },
      skip: (normalizedPage - 1) * normalizedLimit,
      take: normalizedLimit,
    });

    return {
      data: entities.map((entity) => this.toDomain(entity)),
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      totalPages: Math.ceil(total / normalizedLimit),
    };
  }

  async findByProjectId(projectId) {
    const entities = await this.repository.find({
      where: { projectId },
      order: { createdAt: "DESC" },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findByAgentId(agentId) {
    const entities = await this.repository.find({
      where: { agentId },
      order: { createdAt: "DESC" },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findExistingForConversation(conversationId, visitorId = null) {
    const where = {
      conversationId,
    };

    if (visitorId) {
      where.visitorId = visitorId;
    }

    const entity = await this.repository.findOne({
      where,
      order: {
        createdAt: "DESC",
      },
    });

    return this.toDomain(entity);
  }

  async update(id, data) {
    await this.repository.update(id, data);

    const entity = await this.repository.findOne({
      where: { id },
    });

    return this.toDomain(entity);
  }
}
