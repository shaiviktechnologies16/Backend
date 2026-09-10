export class ContextService {
  constructor({ contextRepository }) {
    this.contextRepository = contextRepository;
  }

  async resolveUserContext(userId) {
    return this.contextRepository.resolveUserContext(userId);
  }

  async resolveOrganizationContext(userId, organizationId) {
    return this.contextRepository.resolveOrganizationContext(
      userId,
      organizationId,
    );
  }

  async resolveProjectContext(userId, projectId) {
    return this.contextRepository.resolveProjectContext(userId, projectId);
  }

  async resolveAgentContext(userId, agentId) {
    return this.contextRepository.resolveAgentContext(userId, agentId);
  }
}
