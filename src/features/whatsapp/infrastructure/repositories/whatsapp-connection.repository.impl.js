import { WhatsappConnectionRepository } from "../../domain/repositories/whatsapp-connection.repository.js";
import { WhatsappConnection } from "../../domain/entities/whatsapp-connection.entity.js";
import { WhatsappConnectionOrmEntity } from "../database/whatsapp-connection.orm-entity.js";

export class WhatsappConnectionRepositoryImpl extends WhatsappConnectionRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository(WhatsappConnectionOrmEntity);
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new WhatsappConnection({
      id: entity.id,
      organizationId: entity.organizationId,
      name: entity.name,
      provider: entity.provider,
      phoneNumber: entity.phoneNumber,
      phoneNumberId: entity.phoneNumberId,
      businessAccountId: entity.businessAccountId,
      status: entity.status,
      qualityRating: entity.qualityRating,
      projectId: entity.projectId,
      agentId: entity.agentId,
      credentials: entity.credentials,
      metadata: entity.metadata,
      lastConnectedAt: entity.lastConnectedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(connection) {
    const entity = this.repository.create({
      organizationId: connection.organizationId,
      name: connection.name,
      provider: connection.provider,
      phoneNumber: connection.phoneNumber,
      phoneNumberId: connection.phoneNumberId,
      businessAccountId: connection.businessAccountId,
      status: connection.status,
      qualityRating: connection.qualityRating,
      projectId: connection.projectId,
      agentId: connection.agentId,
      credentials: connection.credentials,
      metadata: connection.metadata,
      lastConnectedAt: connection.lastConnectedAt,
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

  async findByEvolutionInstanceName(instanceName) {
    const entity = await this.repository
      .createQueryBuilder("connection")
      .where(
        "connection.metadata -> 'evolution' ->> 'instanceName' = :instanceName",
        {
          instanceName,
        },
      )
      .getOne();

    return this.toDomain(entity);
  }

  async findByOrganizationId(organizationId) {
    const entities = await this.repository.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findConnectedEvolutionByOrganizationId(organizationId) {
    const entity = await this.repository.findOne({
      where: {
        organizationId,
        provider: "EVOLUTION",
        status: "CONNECTED",
      },
      order: {
        updatedAt: "DESC",
      },
    });

    return this.toDomain(entity);
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

  async findConnectedEvolution() {
    const entity = await this.repository.findOne({
      where: {
        provider: "EVOLUTION",
        status: "CONNECTED",
      },
      order: {
        updatedAt: "DESC",
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

  async delete(id) {
    await this.repository.delete(id);

    return true;
  }
}
