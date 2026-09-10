import { CompanyProfileRepository } from "../../domain/repositories/company-profile.repository.js";
import { CompanyProfileEntity } from "../../domain/entities/company-profile.entity.js";
import { CompanyProfileOrmEntity } from "../database/company-profile.orm-entity.js";

export class CompanyProfileRepositoryImpl extends CompanyProfileRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository(CompanyProfileOrmEntity);
  }

  async findByOrganizationId(organizationId) {
    const entity = await this.repository.findOne({
      where: {
        organizationId,
      },
    });

    return entity ? new CompanyProfileEntity(entity) : null;
  }

  async create(companyProfile, manager = null) {
    const repository = manager
      ? manager.getRepository(CompanyProfileOrmEntity)
      : this.repository;

    const entity = repository.create(companyProfile);

    const saved = await repository.save(entity);

    return new CompanyProfileEntity(saved);
  }

  async update(id, companyProfile, manager = null) {
    const repository = manager
      ? manager.getRepository(CompanyProfileOrmEntity)
      : this.repository;

    await repository.update(id, companyProfile);

    const updated = await repository.findOne({
      where: {
        id,
      },
    });

    return updated ? new CompanyProfileEntity(updated) : null;
  }
}
