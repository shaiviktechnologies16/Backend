export class ConversationRepository {
  async create(conversation, manager = null) {
    throw new Error("Method not implemented.");
  }

  async findById(id, manager = null) {
    throw new Error("Method not implemented.");
  }

  async findAllByUser(userId, manager = null) {
    throw new Error("Method not implemented.");
  }

  async findAllByAgent(agentId, manager = null) {
    throw new Error("Method not implemented.");
  }

  async findAllByProject(projectId, manager = null) {
    throw new Error("Method not implemented.");
  }

  async findByIdAndProject(id, projectId, manager = null) {
    throw new Error("Method not implemented.");
  }

  async findRecentByProjectIds(projectIds, limit = 5) {
    throw new Error("Method not implemented.");
  }

  async countByProjectIds(projectIds, manager = null) {
    throw new Error("Method not implemented.");
  }

  async update(conversation, manager = null) {
    throw new Error("Method not implemented.");
  }

  async delete(id, manager = null) {
    throw new Error("Method not implemented.");
  }
}
