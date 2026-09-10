import { EntitySchema } from "typeorm";
import { PaymentOrder } from "../../domain/entities/payment-order.entity.js";

export const PaymentOrderOrmEntity = new EntitySchema({
  name: "PaymentOrder",
  tableName: "payment_orders",
  target: PaymentOrder,
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    organizationId: {
      type: "uuid",
      name: "organization_id",
    },
    planId: {
      type: "uuid",
      name: "plan_id",
    },
    razorpayOrderId: {
      type: "varchar",
      length: 255,
      name: "razorpay_order_id",
    },
    razorpayPaymentId: {
      type: "varchar",
      length: 255,
      nullable: true,
      name: "razorpay_payment_id",
    },
    razorpaySignature: {
      type: "varchar",
      length: 512,
      nullable: true,
      name: "razorpay_signature",
    },
    amount: {
      type: "integer",
    },
    currency: {
      type: "varchar",
      length: 10,
      default: "INR",
    },
    status: {
      type: "varchar",
      length: 50,
      default: "CREATED",
    },
    billingInterval: {
      type: "varchar",
      length: 20,
      name: "billing_interval",
      default: "MONTHLY",
    },
    metadata: {
      type: "jsonb",
      nullable: true,
    },
    createdAt: {
      type: "timestamp",
      createDate: true,
      name: "created_at",
    },
    updatedAt: {
      type: "timestamp",
      updateDate: true,
      name: "updated_at",
    },
  },
});
