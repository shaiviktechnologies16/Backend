export class ContextRepository {
  async resolveUserContext(userId) {
    throw new Error("Method not implemented.");
  }

  async resolveOrganizationContext(userId, organizationId) {
    throw new Error("Method not implemented.");
  }

  async resolveProjectContext(userId, projectId) {
    throw new Error("Method not implemented.");
  }

  async resolveAgentContext(agentId) {
    throw new Error("Method not implemented.");
  }
}
