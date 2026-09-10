import { AgentToolRepository } from "../../domain/repositories/agent-tool.repository.js";
import { AgentTool } from "../../domain/entities/agent-tool.entity.js";
import { AgentToolOrmEntity } from "../database/agent-tool.orm-entity.js";

export class AgentToolRepositoryImpl extends AgentToolRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository(AgentToolOrmEntity);
  }

  toDomain(entity) {
    if (!entity) {
      return null;
    }

    return new AgentTool({
      id: entity.id,
      agentId: entity.agentId,
      credentialId: entity.credentialId,
      name: entity.name,
      description: entity.description,
      type: entity.type,
      configuration: entity.configuration,
      enabled: entity.enabled,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(tool) {
    const entity = this.repository.create({
      agentId: tool.agentId,
      credentialId: tool.credentialId,
      name: tool.name,
      description: tool.description,
      type: tool.type,
      configuration: tool.configuration,
      enabled: tool.enabled,
    });

    const saved = await this.repository.save(entity);

    return this.toDomain(saved);
  }

  async findById(id) {
    const entity = await this.repository.findOne({
      where: {
        id,
      },
    });

    return this.toDomain(entity);
  }

  async findByAgentId(agentId) {
    const entities = await this.repository.find({
      where: {
        agentId,
      },
      order: {
        createdAt: "ASC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async update(tool) {
    const entity = await this.repository.preload({
      id: tool.id,
      agentId: tool.agentId,
      credentialId: tool.credentialId,
      name: tool.name,
      description: tool.description,
      type: tool.type,
      configuration: tool.configuration,
      enabled: tool.enabled,
    });

    if (!entity) {
      return null;
    }

    const saved = await this.repository.save(entity);

    return this.toDomain(saved);
  }

  async delete(id) {
    await this.repository.delete({
      id,
    });
  }
}
