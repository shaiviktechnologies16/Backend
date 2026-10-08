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
  assert.ok(result.order_id);
});

test("CreatePaymentOrderUseCase supports direct standard amount checkout", async () => {
  const usecase = new CreatePaymentOrderUseCase({});

  const result = await usecase.execute({
    amount: 50000, // ₹500 in paise
    currency: "INR",
    receipt: "rcpt_custom_123",
  });

  assert.equal(result.amount, 50000);
  assert.equal(result.currency, "INR");
  assert.equal(result.receipt, "rcpt_custom_123");
  assert.ok(result.order_id);
});

test("CreatePaymentOrderUseCase rejects amount less than 100 paise", async () => {
  const usecase = new CreatePaymentOrderUseCase({});

  await assert.rejects(
    async () => {
      await usecase.execute({
        amount: 50, // Less than 100 paise
      });
    },
    {
      statusCode: 400,
      errorCode: "INVALID_AMOUNT",
    },
  );
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
    updateStatus: async (id, status) => {
      updatedStatus = status;
    },
  };

  let assignedPlanId = null;
  const mockEntitlementService = {
    changeSubscription: async (organizationId, planId) => {
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
    order_id: razorpayOrderId,
    payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  });

  assert.equal(result.success, true);
  assert.equal(updatedStatus, "PAID");
  assert.equal(assignedPlanId, "plan-pro-123");
});

test("VerifyPaymentUseCase throws 400 on signature mismatch", async () => {
  const razorpayOrderId = "order_test_123";
  const razorpayPaymentId = "pay_test_456";

  const mockPaymentOrder = {
    id: "po-1",
    razorpayOrderId,
    status: "CREATED",
  };

  const mockPaymentOrderRepository = {
    findByRazorpayOrderId: async () => mockPaymentOrder,
    updateStatus: async () => {},
  };

  const usecase = new VerifyPaymentUseCase({
    paymentOrderRepository: mockPaymentOrderRepository,
  });

  await assert.rejects(
    async () => {
      await usecase.execute({
        order_id: razorpayOrderId,
        payment_id: razorpayPaymentId,
        razorpay_signature: "invalid_tampered_signature",
      });
    },
    {
      statusCode: 400,
      errorCode: "INVALID_SIGNATURE",
    },
  );
});

test("VerifyPaymentUseCase throws 400 on missing verification fields", async () => {
  const usecase = new VerifyPaymentUseCase({});

  await assert.rejects(
    async () => {
      await usecase.execute({
        order_id: "order_123",
        // missing payment_id and signature
      });
    },
    {
      statusCode: 400,
      errorCode: "MISSING_FIELDS",
    },
  );
});

test("VerifyPaymentUseCase handles already paid orders (replay protection)", async () => {
  const razorpayOrderId = "order_paid_123";
  const razorpayPaymentId = "pay_paid_456";

  const mockPaymentOrder = {
    id: "po-1",
    razorpayOrderId,
    status: "PAID",
  };

  const mockPaymentOrderRepository = {
    findByRazorpayOrderId: async () => mockPaymentOrder,
  };

  const usecase = new VerifyPaymentUseCase({
    paymentOrderRepository: mockPaymentOrderRepository,
  });

  const result = await usecase.execute({
    order_id: razorpayOrderId,
    payment_id: razorpayPaymentId,
    razorpay_signature: "dummy_sig",
  });

  assert.equal(result.success, true);
  assert.equal(result.message, "Payment already verified and processed.");
});

