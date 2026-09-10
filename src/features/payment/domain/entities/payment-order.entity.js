export class PaymentOrder {
  constructor({
    id,
    organizationId,
    planId,
    razorpayOrderId,
    razorpayPaymentId = null,
    razorpaySignature = null,
    amount,
    currency = "INR",
    status = "CREATED",
    billingInterval = "MONTHLY",
    metadata = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  } = {}) {
    this.id = id;
    this.organizationId = organizationId;
    this.planId = planId;
    this.razorpayOrderId = razorpayOrderId;
    this.razorpayPaymentId = razorpayPaymentId;
    this.razorpaySignature = razorpaySignature;
    this.amount = amount;
    this.currency = currency;
    this.status = status;
    this.billingInterval = billingInterval;
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
