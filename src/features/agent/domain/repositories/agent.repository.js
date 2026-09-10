export class AgentRepository {
  async create(agent) {
    throw new Error("Not implemented");
  }

  async findById(id) {
    throw new Error("Not implemented");
  }

  async findByUserId(userId) {
    throw new Error("Not implemented");
  }

  async findByProjectId(projectId) {
    throw new Error("Not implemented");
  }

  async findByOrganizationId(organizationId) {
    throw new Error("Not implemented");
  }

  async findDefault(userId) {
    throw new Error("Not implemented");
  }

  async findDefaultByProject(projectId) {
    throw new Error("Not implemented");
  }

  async findByPublicKey(publicKey) {
    throw new Error("Not implemented");
  }

  async findRecentByProjectIds(projectIds, limit = 5) {
    throw new Error("Method not implemented.");
  }

  async countByProjectIds(projectIds) {
    throw new Error("Method not implemented.");
  }

  async update(agent) {
    throw new Error("Not implemented");
  }

  async delete(id) {
    throw new Error("Not implemented");
  }

  async setDefault(agentId) {
    throw new Error("Not implemented");
  }
}
