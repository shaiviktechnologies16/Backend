import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { CreatePaymentOrderUseCase } from "./application/use-cases/create-payment-order.usecase.js";
import { VerifyPaymentUseCase } from "./application/use-cases/verify-payment.usecase.js";

test("CreatePaymentOrderUseCase creates razorpay order correctly with paise conversion", async () => {
  const mockPlan = {
    id: "plan-pro-123",
    name: "Pro Tier",
    priceMonthly: 499,
    priceYearly: 4999,
    currency: "INR",
  };

  const mockPlanRepository = {
    findById: async (id) => (id === mockPlan.id ? mockPlan : null),
  };

  const mockPaymentOrderRepository = {
    create: async (data) => ({ id: "po-1", ...data }),
  };

  const usecase = new CreatePaymentOrderUseCase({
    planRepository: mockPlanRepository,
    paymentOrderRepository: mockPaymentOrderRepository,
  });

  const result = await usecase.execute({
    userId: "user-1",
    organizationId: "org-1",
    planId: "plan-pro-123",
    billingInterval: "MONTHLY",
  });

  assert.equal(result.amount, 49900); // 499 * 100 paise
  assert.equal(result.currency, "INR");
  assert.ok(result.razorpayOrderId.startsWith("order_mock_"));
});

test("VerifyPaymentUseCase verifies HMAC-SHA256 signature and upgrades plan", async () => {
  const razorpayOrderId = "order_test_123";
  const razorpayPaymentId = "pay_test_456";
  const secret = process.env.RAZORPAY_KEY_SECRET || "test_razorpay_secret";

  const body = razorpayOrderId + "|" + razorpayPaymentId;
  const razorpaySignature = crypto
    .createHmac("sha256", secret)
    .update(body.toString())
    .digest("hex");

  const mockPaymentOrder = {
    id: "po-1",
    razorpayOrderId,
    planId: "plan-pro-123",
    billingInterval: "MONTHLY",
    amount: 49900,
    status: "CREATED",
  };

  let updatedStatus = null;
  const mockPaymentOrderRepository = {
    findByRazorpayOrderId: async (id) =>
      id === razorpayOrderId ? mockPaymentOrder : null,
    updateStatus: async (id, status, payload) => {
      updatedStatus = status;
    },
  };

  let assignedPlanId = null;
  const mockEntitlementService = {
    changeSubscription: async (organizationId, planId, billingInterval) => {
      assignedPlanId = planId;
      return { success: true };
    },
  };

  const usecase = new VerifyPaymentUseCase({
    paymentOrderRepository: mockPaymentOrderRepository,
    entitlementService: mockEntitlementService,
  });

  const result = await usecase.execute({
    userId: "user-1",
    organizationId: "org-1",
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  assert.equal(result.success, true);
  assert.equal(updatedStatus, "PAID");
  assert.equal(assignedPlanId, "plan-pro-123");
});
