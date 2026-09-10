import { PlatformWhatsappConnection } from "../../domain/entities/platform-whatsapp-connection.entity.js";
import { PlatformWhatsappConnectionOrmEntity } from "../database/platform-whatsapp-connection.orm-entity.js";

export class PlatformWhatsappConnectionRepositoryImpl {
  constructor(dataSource) {
    this.repository = dataSource.getRepository(
      PlatformWhatsappConnectionOrmEntity,
    );
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new PlatformWhatsappConnection({
      id: entity.id,
      name: entity.name,
      provider: entity.provider,
      phoneNumber: entity.phoneNumber,
      status: entity.status,
      qualityRating: entity.qualityRating,
      credentials: entity.credentials,
      metadata: entity.metadata,
      lastConnectedAt: entity.lastConnectedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(connection) {
    const entity = this.repository.create({
      name: connection.name,
      provider: connection.provider,
      phoneNumber: connection.phoneNumber,
      status: connection.status,
      qualityRating: connection.qualityRating,
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

  async findAll() {
    const entities = await this.repository.find({
      order: {
        createdAt: "DESC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findByProvider(provider) {
    const entities = await this.repository.find({
      where: { provider },
      order: {
        createdAt: "DESC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findConnectedEvolution() {
    const entity = await this.repository
      .createQueryBuilder("connection")
      .where("connection.provider = :provider", {
        provider: "EVOLUTION",
      })
      .andWhere("connection.status = :status", {
        status: "CONNECTED",
      })
      .andWhere(
        "connection.metadata -> 'evolution' ->> 'instanceName' IS NOT NULL",
      )
      .orderBy("connection.createdAt", "DESC")
      .getOne();

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
