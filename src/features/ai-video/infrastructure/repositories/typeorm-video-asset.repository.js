import { VideoAssetRepository } from "../../domain/repositories/video-asset.repository.js";
import { VideoAsset } from "../../domain/entities/video-asset.entity.js";
import { VideoAssetOrmEntity } from "../database/video-asset.orm-entity.js";

export class TypeOrmVideoAssetRepository extends VideoAssetRepository {
  constructor(dataSource) {
    super();
    this.repository = dataSource.getRepository(VideoAssetOrmEntity);
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new VideoAsset({
      id: entity.id,
      videoProjectId: entity.videoProjectId,
      sceneId: entity.sceneId,
      type: entity.type,
      provider: entity.provider,
      url: entity.url,
      storageKey: entity.storageKey,
      mimeType: entity.mimeType,
      size: entity.size ? Number(entity.size) : null,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(assetData) {
    const entity = this.repository.create({
      videoProjectId: assetData.videoProjectId,
      sceneId: assetData.sceneId || null,
      type: assetData.type,
      provider: assetData.provider || "system",
      url: assetData.url,
      storageKey: assetData.storageKey || null,
      mimeType: assetData.mimeType || null,
      size: assetData.size || null,
      metadata: assetData.metadata || null,
    });

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id) {
    const entity = await this.repository.findOne({ where: { id } });
    return this.toDomain(entity);
  }

  async findByProjectId(videoProjectId) {
    const entities = await this.repository.find({
      where: { videoProjectId },
      order: { createdAt: "ASC" },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findBySceneId(sceneId) {
    const entities = await this.repository.find({
      where: { sceneId },
      order: { createdAt: "ASC" },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async delete(id) {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }

  async deleteByProjectId(videoProjectId) {
    const result = await this.repository.delete({ videoProjectId });
    return (result.affected || 0) > 0;
  }
}
