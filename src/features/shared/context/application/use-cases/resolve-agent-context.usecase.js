import { AgentContextEntity } from "../../domain/entities/agent-context.entity.js";
import { ContextErrors } from "../../domain/constants/context-errors.js";
import { AppError } from "../../../../../common/errors/AppError.js";

export class ResolveAgentContextUseCase {
  constructor({ agentRepository, projectMemberRepository, projectRepository }) {
    this.agentRepository = agentRepository;
    this.projectMemberRepository = projectMemberRepository;
    this.projectRepository = projectRepository;
  }

  async execute(userId, agentId, organizationId, projectId) {
    const agent = await this.agentRepository.findById(agentId);

    if (!agent) {
      throw new AppError(
        "Agent not found.",
        404,
        ContextErrors.AGENT_CONTEXT_NOT_FOUND,
      );
    }

    if (projectId && agent.projectId !== projectId) {
      throw new AppError(
        "Agent does not belong to this project.",
        403,
        ContextErrors.AGENT_CONTEXT_NOT_FOUND,
      );
    }

    const project = await this.projectRepository.findById(agent.projectId);

    if (!project) {
      throw new AppError(
        "Project not found.",
        404,
        ContextErrors.PROJECT_CONTEXT_NOT_FOUND,
      );
    }

    if (organizationId && project.organizationId !== organizationId) {
      throw new AppError(
        "Agent does not belong to this organization.",
        403,
        ContextErrors.AGENT_CONTEXT_NOT_FOUND,
      );
    }

    const membership = await this.projectMemberRepository.findByProjectAndUser(
      agent.projectId,
      userId,
    );

    if (!membership) {
      throw new AppError(
        "Agent access denied.",
        403,
        ContextErrors.AGENT_CONTEXT_NOT_FOUND,
      );
    }

    return new AgentContextEntity({
      id: agent.id,
      name: agent.name,
      provider: agent.provider,
      model: agent.model,
      status: agent.status,
      projectId: agent.projectId,
      organizationId: project.organizationId,
      role: membership.role,
    });
  }
}
