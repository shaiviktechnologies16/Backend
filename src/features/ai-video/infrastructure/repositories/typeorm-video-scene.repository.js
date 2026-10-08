import { VideoSceneRepository } from "../../domain/repositories/video-scene.repository.js";
import { VideoScene } from "../../domain/entities/video-scene.entity.js";
import { VideoSceneOrmEntity } from "../database/video-scene.orm-entity.js";

export class TypeOrmVideoSceneRepository extends VideoSceneRepository {
  constructor(dataSource) {
    super();
    this.repository = dataSource.getRepository(VideoSceneOrmEntity);
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new VideoScene({
      id: entity.id,
      videoProjectId: entity.videoProjectId,
      sceneNumber: entity.sceneNumber,
      duration: entity.duration,
      visualPrompt: entity.visualPrompt,
      motionPrompt: entity.motionPrompt,
      dialogue: entity.dialogue,
      speaker: entity.speaker,
      characterIds: entity.characterIds,
      referenceImageUrl: entity.referenceImageUrl,
      videoUrl: entity.videoUrl,
      audioUrl: entity.audioUrl,
      status: entity.status,
      errorMessage: entity.errorMessage,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(sceneData) {
    const entity = this.repository.create({
      videoProjectId: sceneData.videoProjectId,
      sceneNumber: sceneData.sceneNumber,
      duration: sceneData.duration || 5,
      visualPrompt: sceneData.visualPrompt || null,
      motionPrompt: sceneData.motionPrompt || null,
      dialogue: sceneData.dialogue || null,
      speaker: sceneData.speaker || null,
      characterIds: sceneData.characterIds || [],
      referenceImageUrl: sceneData.referenceImageUrl || null,
      videoUrl: sceneData.videoUrl || null,
      audioUrl: sceneData.audioUrl || null,
      status: sceneData.status || "PENDING",
      errorMessage: sceneData.errorMessage || null,
      metadata: sceneData.metadata || null,
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
      order: { sceneNumber: "ASC" },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByProjectAndNumber(videoProjectId, sceneNumber) {
    const entity = await this.repository.findOne({
      where: { videoProjectId, sceneNumber },
    });
    return this.toDomain(entity);
  }

  async update(id, updateData) {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async updateStatus(id, status, extraPayload = {}) {
    await this.repository.update(id, {
      status,
      ...extraPayload,
    });
    return this.findById(id);
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
