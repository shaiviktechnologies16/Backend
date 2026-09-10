import { PlatformConfigRepository } from "../../domain/repositories/platform-config.repository.js";
import { PlatformConfigEntity } from "../../domain/entities/platform-config.entity.js";
import { PlatformConfigOrmEntity } from "../database/platform-config.orm-entity.js";

export class PlatformConfigRepositoryImpl extends PlatformConfigRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository(PlatformConfigOrmEntity);
  }

  async findAll() {
    const configs = await this.repository.find({
      order: {
        configKey: "ASC",
      },
    });

    return configs.map((config) => new PlatformConfigEntity(config));
  }

  async findByKey(configKey) {
    const config = await this.repository.findOne({
      where: {
        configKey,
      },
    });

    return config ? new PlatformConfigEntity(config) : null;
  }

  async create(data) {
    const config = this.repository.create(data);

    const saved = await this.repository.save(config);

    return new PlatformConfigEntity(saved);
  }

  async update(configKey, data) {
    await this.repository.update(
      {
        configKey,
      },
      {
        ...data,
        updatedAt: new Date(),
      },
    );

    return this.findByKey(configKey);
  }

  async delete(configKey) {
    const result = await this.repository.delete({
      configKey,
    });

    return result.affected > 0;
  }
}
