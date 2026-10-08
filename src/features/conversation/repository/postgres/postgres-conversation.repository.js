import { In } from "typeorm";
import { Conversation } from "../../entity/conversation.entity.js";
import { ConversationRepository } from "../interfaces/conversation.repository.js";

export class PostgresConversationRepository extends ConversationRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository("Conversation");
  }

  getRepository(manager = null) {
    return manager ? manager.getRepository("Conversation") : this.repository;
  }

  toDomain(entity) {
    if (!entity) return null;

    return new Conversation({
      id: entity.id,
      userId: entity.userId,
      visitorId: entity.visitorId,
      projectId: entity.projectId,
      agentId: entity.agentId,
      title: entity.title,
      isHandover: Boolean(entity.isHandover),
      handoverRequestedAt: entity.handoverRequestedAt ?? null,
      isCompleted: Boolean(entity.isCompleted),
      completedAt: entity.completedAt ?? null,
      completedBy: entity.completedBy ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toPersistence(conversation) {
    const entity = {
      id: conversation.id,
      userId: conversation.userId,
      visitorId: conversation.visitorId,
      projectId: conversation.projectId,
      agentId: conversation.agentId,
      title: conversation.title,
      isHandover: Boolean(conversation.isHandover),
      handoverRequestedAt: conversation.handoverRequestedAt,
      isCompleted: Boolean(conversation.isCompleted),
      completedAt: conversation.completedAt,
      completedBy: conversation.completedBy,
    };

    if (conversation.createdAt !== null) {
      entity.createdAt = conversation.createdAt;
    }

    if (conversation.updatedAt !== null) {
      entity.updatedAt = conversation.updatedAt;
    }

    return entity;
  }

  async createForStreaming(conversation, manager = null) {
    const repository = this.getRepository(manager);

    const entity = repository.create({
      userId: conversation.userId,
      visitorId: conversation.visitorId,
      projectId: conversation.projectId,
      agentId: conversation.agentId,
      title: conversation.title,
    });

    await repository.insert(entity);

    return this.toDomain(entity);
  }

  async create(conversation, manager = null) {
    const repository = this.getRepository(manager);

    const entity = repository.create({
      userId: conversation.userId,
      visitorId: conversation.visitorId,
      projectId: conversation.projectId,
      agentId: conversation.agentId,
      title: conversation.title,
    });

    const saved = await repository.save(entity);

    return this.toDomain(saved);
  }

  async findById(id, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: { id },
    });

    return this.toDomain(entity);
  }

  async findAllByUser(userId, manager = null) {
    const repository = this.getRepository(manager);

    const entities = await repository.find({
      where: {
        userId,
      },
      order: {
        updatedAt: "DESC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findAllByProjectAndUser(projectId, userId, manager = null) {
    const repository = this.getRepository(manager);

    const entities = await repository.find({
      where: {
        projectId,
        userId,
      },
      order: {
        updatedAt: "DESC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findAllByAgent(agentId, manager = null) {
    const repository = this.getRepository(manager);

    const entities = await repository.find({
      where: {
        agentId,
      },
      order: {
        updatedAt: "DESC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findLatestByVisitorAndAgent(visitorId, agentId, manager = null) {
    if (!visitorId || !agentId) return null;

    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: {
        visitorId,
        agentId,
      },
      order: {
        updatedAt: "DESC",
      },
    });

    return this.toDomain(entity);
  }

  async findAllByProject(projectId, manager = null) {
    const repository = this.getRepository(manager);

    const entities = await repository.find({
      where: {
        projectId,
      },
      order: {
        updatedAt: "DESC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findByIdAndProject(id, projectId, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: {
        id,
        projectId,
      },
    });

    return this.toDomain(entity);
  }

  async findRecentByProjectIds(projectIds, limit = 5, manager = null) {
    if (!projectIds.length) {
      return [];
    }

    const repository = this.getRepository(manager);

    const entities = await repository.find({
      where: {
        projectId: In(projectIds),
      },
      order: {
        updatedAt: "DESC",
      },
      take: limit,
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async countByProjectIds(projectIds, manager = null) {
    if (!projectIds.length) {
      return 0;
    }

    const repository = this.getRepository(manager);

    return repository
      .createQueryBuilder("conversation")
      .where("conversation.projectId IN (:...projectIds)", {
        projectIds,
      })
      .getCount();
  }

  async update(conversation, manager = null) {
    const repository = this.getRepository(manager);

    await repository.save(this.toPersistence(conversation));

    return this.findById(conversation.id, manager);
  }

  async delete(id, manager = null) {
    const repository = this.getRepository(manager);

    await repository.delete({
      id,
    });
  }
}
