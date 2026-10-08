import { UploadRepository } from "../../domain/repositories/upload.repository.js";
import { Upload } from "../../domain/entities/upload.entity.js";
import { UploadOrmEntity } from "../database/upload.orm-entity.js";

export class TypeOrmUploadRepository extends UploadRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository(UploadOrmEntity);
  }

  getRepository(manager = null) {
    return manager ? manager.getRepository(UploadOrmEntity) : this.repository;
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new Upload({
      id: entity.id,
      purpose: entity.purpose,
      uploadedBy: entity.uploadedBy,
      organizationId: entity.organizationId,
      projectId: entity.projectId,
      originalName: entity.originalName,
      mimeType: entity.mimeType,
      size: entity.size,
      storageProvider: entity.storageProvider,
      storageKey: entity.storageKey,
      storageUrl: entity.storageUrl,
      sourceUrl: entity.sourceUrl,
      status: entity.status,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(upload, manager = null) {
    const repository = this.getRepository(manager);

    const entity = repository.create({
      purpose: upload.purpose,
      uploadedBy: upload.uploadedBy,
      organizationId: upload.organizationId,
      projectId: upload.projectId,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      size: upload.size,
      storageProvider: upload.storageProvider,
      storageKey: upload.storageKey,
      storageUrl: upload.storageUrl,
      sourceUrl: upload.sourceUrl,
      status: upload.status,
      metadata: upload.metadata,
    });

    const saved = await repository.save(entity);

    return this.toDomain(saved);
  }

  async findById(id, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: {
        id,
      },
    });

    return this.toDomain(entity);
  }

  async update(upload, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(upload.id, {
      purpose: upload.purpose,
      uploadedBy: upload.uploadedBy,
      organizationId: upload.organizationId,
      projectId: upload.projectId,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      size: upload.size,
      storageProvider: upload.storageProvider,
      storageKey: upload.storageKey,
      storageUrl: upload.storageUrl,
      sourceUrl: upload.sourceUrl,
      status: upload.status,
      metadata: upload.metadata,
    });

    return this.findById(upload.id, manager);
  }

  async findByPurpose(
    { purpose, uploadedBy = null, limit = 50, offset = 0 },
    manager = null,
  ) {
    const repository = this.getRepository(manager);

    const where = { purpose };
    if (uploadedBy) {
      where.uploadedBy = uploadedBy;
    }

    const [entities, total] = await repository.findAndCount({
      where,
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });

    return {
      uploads: entities.map((entity) => this.toDomain(entity)),
      total,
    };
  }
}
