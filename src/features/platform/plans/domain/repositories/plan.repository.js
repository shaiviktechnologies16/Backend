export class PlanRepository {
  async findById(id) {
    throw new Error("Method not implemented");
  }

  async findByCode(code) {
    throw new Error("Method not implemented");
  }

  async findAll() {
    throw new Error("Method not implemented");
  }

  async create(plan) {
    throw new Error("Method not implemented");
  }

  async update(id, data) {
    throw new Error("Method not implemented");
  }

  async delete(id) {
    throw new Error("Method not implemented");
  }

  async findUsageLimit(planId) {
    throw new Error("Method not implemented");
  }

  async updateUsageLimit(planId, data) {
    throw new Error("Method not implemented");
  }

  async getUsageStats({ organizationId, startDate }) {
    throw new Error("Method not implemented");
  }

  async getConversationCount({ organizationId, startDate }) {
    throw new Error("Method not implemented");
  }

  async findOrganizationPlan(organizationId) {
    throw new Error("Method not implemented");
  }
  async findOrganizationPlanWithLimits(organizationId) {
    throw new Error("Method not implemented.");
  }
}
