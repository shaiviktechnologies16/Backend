import { AppDataSource } from "../../../../database/datasource.js";
import { Message } from "../../entity/message.entity.js";
import { MessageRepository } from "../interfaces/message.repository.js";

export class PostgresMessageRepository extends MessageRepository {
  constructor() {
    super();
    this.repository = AppDataSource.getRepository("Message");
  }

  getRepository(manager = null) {
    return manager ? manager.getRepository("Message") : this.repository;
  }

  toDomain(entity) {
    if (!entity) return null;

    return new Message({
      id: entity.id,
      conversationId: entity.conversation.id,
      role: entity.role,
      content: entity.content,
      createdAt: entity.createdAt,
    });
  }

  toPersistence(message) {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      conversation: {
        id: message.conversationId,
      },
    };
  }

  async createForStreaming(message, manager = null) {
    const repository = this.getRepository(manager);
    const entity = repository.create(this.toPersistence(message));
    await repository.insert(entity);
    return this.toDomain(entity);
  }

  async create(message, manager = null) {
    const repository = this.getRepository(manager);

    const entity = repository.create(this.toPersistence(message));

    const saved = await repository.save(entity);

    return this.toDomain(saved);
  }

  async findById(id, manager = null) {
    const repository = this.getRepository(manager);
    const entity = await repository.findOne({
      where: { id },
      relations: {
        conversation: true,
      },
    });
    return this.toDomain(entity);
  }

  async findByConversationId(conversationId, manager = null) {
    const repository = this.getRepository(manager);

    const entities = await repository.find({
      where: {
        conversation: {
          id: conversationId,
        },
      },
      relations: {
        conversation: true,
      },
      order: {
        createdAt: "ASC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findRecentByConversationId(conversationId, limit = 20, manager = null) {
    const repository = this.getRepository(manager);

    const entities = await repository.find({
      where: {
        conversation: {
          id: conversationId,
        },
      },
      relations: {
        conversation: true,
      },
      order: {
        createdAt: "DESC",
        id: "DESC",
      },
      take: limit,
    });

    entities.sort((a, b) => {
      const timeDiff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      if (a.role === "user" && b.role === "assistant") return -1;
      if (a.role === "assistant" && b.role === "user") return 1;
      return String(a.id).localeCompare(String(b.id));
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async deleteByConversationId(conversationId, manager = null) {
    const repository = this.getRepository(manager);

    await repository.delete({
      conversation: {
        id: conversationId,
      },
    });
  }

  async delete(id, conversationId = null, manager = null) {
    let actualManager = manager;
    let actualConvId = conversationId;
    if (conversationId && typeof conversationId === "object" && !manager) {
      actualManager = conversationId;
      actualConvId = null;
    }
    const repository = this.getRepository(actualManager);
    const where = { id };
    if (actualConvId && typeof actualConvId === "string") {
      where.conversation = { id: actualConvId };
    }
    await repository.delete(where);
  }
}
