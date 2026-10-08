import { WebhookRepository } from "../../domain/repositories/webhook.repository.js";
import { Webhook } from "../../domain/entities/webhook.entity.js";
import { WebhookOrmEntity } from "../database/webhook.orm-entity.js";
import { WebhookDeliveryOrmEntity } from "../database/webhook-delivery.orm-entity.js";

export class WebhookRepositoryImpl extends WebhookRepository {
  constructor(dataSource) {
    super();
    this.webhookRepository = dataSource.getRepository(WebhookOrmEntity);
    this.deliveryRepository = dataSource.getRepository(
      WebhookDeliveryOrmEntity,
    );
  }

  toDomain(entity) {
    if (!entity) return null;

    return new Webhook({
      id: entity.id,
      organizationId: entity.organizationId,
      url: entity.url,
      secret: entity.secret,
      events: entity.events,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(webhook) {
    const entity = this.webhookRepository.create({
      organizationId: webhook.organizationId,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
      isActive: webhook.isActive,
    });

    const saved = await this.webhookRepository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id) {
    const entity = await this.webhookRepository.findOne({
      where: { id },
    });
    return this.toDomain(entity);
  }

  async findByOrganizationId(organizationId) {
    const entities = await this.webhookRepository.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findActiveByOrganizationAndEvent(organizationId, event) {
    const allActive = await this.webhookRepository.find({
      where: { organizationId, isActive: true },
    });

    return allActive
      .filter((webhook) => {
        if (!Array.isArray(webhook.events)) return false;
        return webhook.events.includes("*") || webhook.events.includes(event);
      })
      .map((entity) => this.toDomain(entity));
  }

  async delete(id) {
    await this.webhookRepository.delete({ id });
  }

  async recordDelivery({
    webhookId,
    event,
    payload,
    responseStatus = null,
    responseBody = null,
    status = "SUCCESS",
    durationMs = null,
  }) {
    const entity = this.deliveryRepository.create({
      webhookId,
      event,
      payload,
      responseStatus,
      responseBody,
      status,
      durationMs,
    });

    await this.deliveryRepository.save(entity);
  }
}
