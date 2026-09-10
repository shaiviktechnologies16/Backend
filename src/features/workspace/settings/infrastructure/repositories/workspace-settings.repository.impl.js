import { WorkspaceSettingsRepository } from "../../domain/repositories/workspace-settings.repository.js";
import { WorkspaceSettingsEntity } from "../../domain/entities/workspace-settings.entity.js";
import { WorkspaceSettingsOrmEntity } from "../database/workspace-settings.orm-entity.js";

export class WorkspaceSettingsRepositoryImpl extends WorkspaceSettingsRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository(WorkspaceSettingsOrmEntity);
  }

  async findByOrganizationId(organizationId) {
    const entity = await this.repository.findOne({
      where: {
        organizationId,
      },
    });

    return entity ? new WorkspaceSettingsEntity(entity) : null;
  }

  async create(settings, manager = null) {
    const repository = manager
      ? manager.getRepository(WorkspaceSettingsOrmEntity)
      : this.repository;

    const entity = repository.create(settings);

    const saved = await repository.save(entity);

    return new WorkspaceSettingsEntity(saved);
  }

  async update(id, settings) {
    await this.repository.update(id, settings);

    const updated = await this.repository.findOne({
      where: {
        id,
      },
    });

    return updated ? new WorkspaceSettingsEntity(updated) : null;
  }
}
