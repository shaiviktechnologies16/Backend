import { PaymentOrderRepository } from "../../domain/repositories/payment-order.repository.js";
import { PaymentOrder } from "../../domain/entities/payment-order.entity.js";
import { PaymentOrderOrmEntity } from "../database/payment-order.orm-entity.js";

export class PaymentOrderRepositoryImpl extends PaymentOrderRepository {
  constructor(dataSource) {
    super();
    this.repository = dataSource.getRepository(PaymentOrderOrmEntity);
  }

  toDomain(entity) {
    if (!entity) return null;
    return new PaymentOrder({
      id: entity.id,
      organizationId: entity.organizationId,
      planId: entity.planId,
      razorpayOrderId: entity.razorpayOrderId,
      razorpayPaymentId: entity.razorpayPaymentId,
      razorpaySignature: entity.razorpaySignature,
      amount: entity.amount,
      currency: entity.currency,
      status: entity.status,
      billingInterval: entity.billingInterval,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async create(paymentOrder) {
    const entity = this.repository.create({
      organizationId: paymentOrder.organizationId,
      planId: paymentOrder.planId,
      razorpayOrderId: paymentOrder.razorpayOrderId,
      razorpayPaymentId: paymentOrder.razorpayPaymentId,
      razorpaySignature: paymentOrder.razorpaySignature,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency || "INR",
      status: paymentOrder.status || "CREATED",
      billingInterval: paymentOrder.billingInterval || "MONTHLY",
      metadata: paymentOrder.metadata,
    });

    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id) {
    const entity = await this.repository.findOne({ where: { id } });
    return this.toDomain(entity);
  }

  async findByRazorpayOrderId(razorpayOrderId) {
    const entity = await this.repository.findOne({
      where: { razorpayOrderId },
    });
    return this.toDomain(entity);
  }

  async updateStatus(id, status, details = {}) {
    const updateData = { status, updatedAt: new Date() };

    if (details.razorpayPaymentId) {
      updateData.razorpayPaymentId = details.razorpayPaymentId;
    }
    if (details.razorpaySignature) {
      updateData.razorpaySignature = details.razorpaySignature;
    }
    if (details.metadata) {
      updateData.metadata = details.metadata;
    }

    await this.repository.update(id, updateData);
    return this.findById(id);
  }
}
