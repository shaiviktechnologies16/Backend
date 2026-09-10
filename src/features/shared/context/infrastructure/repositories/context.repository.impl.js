import { ContextRepository } from "../../domain/repositories/context.repository.js";

export class ContextRepositoryImpl extends ContextRepository {
  constructor({
    userRepository,
    organizationRepository,
    projectRepository,
    agentRepository,
    organizationMemberRepository,
    projectMemberRepository,
  }) {
    super();

    this.userRepository = userRepository;
    this.organizationRepository = organizationRepository;
    this.projectRepository = projectRepository;
    this.agentRepository = agentRepository;
    this.organizationMemberRepository = organizationMemberRepository;
    this.projectMemberRepository = projectMemberRepository;
  }

  async resolveUserContext(userId) {
    return this.userRepository.findById(userId);
  }

  async resolveOrganizationContext(userId, organizationId) {
    const membership =
      await this.organizationMemberRepository.findByOrganizationAndUser(
        organizationId,
        userId,
      );

    if (!membership) {
      return null;
    }

    return this.organizationRepository.findById(organizationId);
  }

  async resolveProjectContext(userId, projectId) {
    const membership = await this.projectMemberRepository.findByProjectAndUser(
      projectId,
      userId,
    );

    if (!membership) {
      return null;
    }

    return this.projectRepository.findById(projectId);
  }

  async resolveAgentContext(agentId) {
    return this.agentRepository.findById(agentId);
  }
}
