import { EnquiryNotificationRecipientOrmEntity } from "../database/enquiry-notification-recipient.orm-entity.js";

export class EnquiryNotificationRecipientRepositoryImpl {
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.repository = dataSource.getRepository(
      EnquiryNotificationRecipientOrmEntity,
    );
  }

  getRepository(manager = null) {
    return manager
      ? manager.getRepository(EnquiryNotificationRecipientOrmEntity)
      : this.repository;
  }

  async findAllByOrganization(organizationId, manager = null) {
    const repository = this.getRepository(manager);

    return repository.find({
      where: {
        organizationId,
      },
      order: {
        createdAt: "ASC",
      },
    });
  }

  async findEnabledByOrganizationAndChannel(
    organizationId,
    channel = "WHATSAPP",
    manager = null,
  ) {
    const repository = this.getRepository(manager);

    return repository.find({
      where: {
        organizationId,
        channel,
        enabled: true,
      },
      order: {
        createdAt: "ASC",
      },
    });
  }

  async findByPhoneNumber(
    organizationId,
    recipientPhoneNumber,
    channel = "WHATSAPP",
    manager = null,
  ) {
    const repository = this.getRepository(manager);

    return repository.findOne({
      where: {
        organizationId,
        recipientPhoneNumber,
        channel,
      },
    });
  }

  async create(data, manager = null) {
    const repository = this.getRepository(manager);

    const entity = repository.create({
      organizationId: data.organizationId,
      organizationMemberId: data.organizationMemberId ?? null,
      recipientPhoneNumber: data.recipientPhoneNumber,
      channel: data.channel ?? "WHATSAPP",
      enabled: data.enabled !== false,
    });

    return repository.save(entity);
  }

  async update(id, data, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(id, {
      ...data,
      updatedAt: new Date(),
    });

    return repository.findOne({
      where: {
        id,
      },
    });
  }

  async updateByPhoneNumber(
    organizationId,
    recipientPhoneNumber,
    data,
    channel = "WHATSAPP",
    manager = null,
  ) {
    const repository = this.getRepository(manager);

    const recipient = await repository.findOne({
      where: {
        organizationId,
        recipientPhoneNumber,
        channel,
      },
    });

    if (!recipient) {
      return null;
    }

    await repository.update(recipient.id, {
      ...data,
      updatedAt: new Date(),
    });

    return repository.findOne({
      where: {
        id: recipient.id,
      },
    });
  }

  async delete(id, manager = null) {
    const repository = this.getRepository(manager);

    await repository.delete(id);

    return true;
  }
}
