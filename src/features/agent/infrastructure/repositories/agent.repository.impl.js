import { In } from "typeorm";
import { AgentRepository } from "../../domain/repositories/agent.repository.js";
import { Agent } from "../../domain/entities/agent.entity.js";
import { AgentOrmEntity } from "../database/agent.orm-entity.js";

export class AgentRepositoryImpl extends AgentRepository {
  constructor(dataSource) {
    super();

    this.repository = dataSource.getRepository(AgentOrmEntity);
  }
  toDomain(entity) {
    if (!entity) return null;

    return new Agent({
      id: entity.id,
      userId: entity.userId,
      projectId: entity.projectId,

      project: entity.project
        ? {
            id: entity.project.id,
            name: entity.project.name,
            organizationId: entity.project.organizationId,
          }
        : null,
      aiModelId: entity.aiModelId,

      aiModel: entity.aiModel
        ? {
            id: entity.aiModel.id,
            provider: entity.aiModel.provider,
            model: entity.aiModel.model,
            displayName: entity.aiModel.displayName,
            description: entity.aiModel.description,
            status: entity.aiModel.status,
          }
        : null,

      name: entity.name,
      description: entity.description,
      systemPrompt: entity.systemPrompt,

      provider: entity.provider,
      model: entity.model,

      temperature: entity.temperature,
      maxTokens: entity.maxTokens,

      isDefault: entity.isDefault,

      visibility: entity.visibility,
      publicKey: entity.publicKey,
      publicEnabledAt: entity.publicEnabledAt,

      widgetConfig: entity.widgetConfig,

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(agent) {
    if (agent.isDefault) {
      await this.repository.update(
        {
          projectId: agent.projectId,
          isDefault: true,
        },
        {
          isDefault: false,
        },
      );
    }

    const data = {
      userId: agent.userId,
      projectId: agent.projectId,
      aiModelId: agent.aiModelId,

      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      provider: agent.provider,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      isDefault: agent.isDefault,
      visibility: agent.visibility,
      publicKey: agent.publicKey,
      publicEnabledAt: agent.publicEnabledAt,
      widgetConfig: agent.widgetConfig,
    };

    const entity = this.repository.create(data);
    const saved = await this.repository.save(entity);
    const result = await this.repository.findOne({
      where: {
        id: saved.id,
      },
      relations: {
        aiModel: true,
      },
    });

    console.log("LOADED RESULT:", {
      id: result.id,
      aiModelId: result.aiModelId,
      aiModel: result.aiModel,
    });
    return this.toDomain(result);
  }

  async findById(id) {
    console.log("SEARCHING AGENT ID:", id);

    const entity = await this.repository.findOne({
      where: {
        id,
      },
      relations: {
        aiModel: true,
        project: true,
      },
    });

    return this.toDomain(entity);
  }

  async findByUserId(userId) {
    const entities = await this.repository.find({
      where: {
        userId,
      },
      relations: {
        aiModel: true,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findByProjectId(projectId) {
    const entities = await this.repository.find({
      where: {
        projectId,
      },
      relations: {
        aiModel: true,
        project: true,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findByNameAndProject(projectId, name) {
    const entity = await this.repository.findOne({
      where: {
        projectId,
        name,
      },
    });

    return this.toDomain(entity);
  }

  async findByOrganizationId(organizationId) {
    const entities = await this.repository.find({
      where: {
        project: {
          organizationId,
        },
      },
      relations: {
        aiModel: true,
        project: true,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findDefault(userId) {
    const entity = await this.repository.findOne({
      where: {
        userId,
        isDefault: true,
      },
      relations: {
        aiModel: true,
      },
    });

    return this.toDomain(entity);
  }

  async findDefaultByProject(projectId) {
    const entity = await this.repository.findOne({
      where: {
        projectId,
        isDefault: true,
      },
      relations: {
        aiModel: true,
      },
    });

    return this.toDomain(entity);
  }

  async findByPublicKey(publicKey) {
    const entity = await this.repository.findOne({
      where: {
        publicKey,
        visibility: "PUBLIC",
      },
      relations: {
        aiModel: true,
        project: true,
      },
    });

    return this.toDomain(entity);
  }

  async update(agent) {
    if (agent.isDefault) {
      await this.repository.update(
        {
          projectId: agent.projectId,
          isDefault: true,
        },
        {
          isDefault: false,
        },
      );
    }

    await this.repository.update(agent.id, {
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,

      temperature: agent.temperature,
      maxTokens: agent.maxTokens,

      isDefault: agent.isDefault,

      visibility: agent.visibility,

      publicKey: agent.publicKey,
      publicEnabledAt: agent.publicEnabledAt,

      widgetConfig: agent.widgetConfig,
    });

    return this.findById(agent.id);
  }

  async delete(id) {
    await this.repository.delete(id);
  }

  async setDefault(agentId) {
    const agent = await this.findById(agentId);

    if (!agent) {
      return null;
    }

    await this.repository.update(
      {
        projectId: agent.projectId,
        isDefault: true,
      },
      {
        isDefault: false,
      },
    );

    await this.repository.update(
      {
        id: agentId,
      },
      {
        isDefault: true,
      },
    );

    return this.findById(agentId);
  }
  async findRecentByProjectIds(projectIds, limit = 5) {
    if (!projectIds.length) {
      return [];
    }

    const entities = await this.repository.find({
      where: {
        projectId: In(projectIds),
      },
      relations: {
        aiModel: true,
      },
      order: {
        createdAt: "DESC",
      },
      take: limit,
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async countByProjectIds(projectIds) {
    if (!projectIds.length) {
      return 0;
    }

    return this.repository
      .createQueryBuilder("agent")
      .where("agent.projectId IN (:...projectIds)", { projectIds })
      .getCount();
  }
}
