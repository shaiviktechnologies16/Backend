export class WebhookRepository {
  async create(webhook) {
    throw new Error("Not implemented");
  }

  async findById(id) {
    throw new Error("Not implemented");
  }

  async findByOrganizationId(organizationId) {
    throw new Error("Not implemented");
  }

  async findActiveByOrganizationAndEvent(organizationId, event) {
    throw new Error("Not implemented");
  }

  async delete(id) {
    throw new Error("Not implemented");
  }

  async recordDelivery(deliveryData) {
    throw new Error("Not implemented");
  }
}
