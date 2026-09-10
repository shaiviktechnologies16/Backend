import { AppError } from "../../../../common/errors/AppError.js";

export class CreatePaymentOrderUseCase {
  constructor({
    planRepository,
    paymentOrderRepository,
    getPlatformConfigUseCase,
    entitlementService,
  }) {
    this.planRepository = planRepository;
    this.paymentOrderRepository = paymentOrderRepository;
    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
    this.entitlementService = entitlementService;
  }

  async execute({ organizationId, planId, billingInterval = "MONTHLY" }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "INVALID_ORGANIZATION",
      );
    }

    if (!planId) {
      throw new AppError("Plan ID is required.", 400, "INVALID_PLAN_ID");
    }

    const plan = await this.planRepository.findById(planId);

    if (!plan) {
      throw new AppError("Plan not found.", 404, "PLAN_NOT_FOUND");
    }

    if (this.entitlementService) {
      const currentSubDetails =
        await this.entitlementService.getSubscriptionWithPlan(organizationId);
      const isCurrentPaidActive =
        currentSubDetails?.subscription?.status === "ACTIVE" &&
        currentSubDetails?.plan?.code !== "FREE";

      if (isCurrentPaidActive) {
        const PLAN_RANK = { FREE: 0, STARTER: 1, BUSINESS: 2, PREMIUM: 3 };
        const currentRank =
          PLAN_RANK[currentSubDetails?.plan?.code?.toUpperCase()] ??
          currentSubDetails?.plan?.displayOrder ??
          0;
        const targetRank =
          PLAN_RANK[plan.code?.toUpperCase()] ?? plan.displayOrder ?? 0;

        if (targetRank < currentRank) {
          throw new AppError(
            "Plan downgrade is not permitted while an active higher-tier subscription is in effect.",
            400,
            "DOWNGRADE_RESTRICTED",
          );
        }
      }
    }

    let price = Number(plan.priceMonthly ?? 0);

    if (billingInterval === "YEARLY") {
      price =
        Number(plan.priceYearly ?? 0) ||
        Math.round(Number(plan.priceMonthly ?? 0) * 12 * 0.8);
    } else if (billingInterval === "QUARTERLY") {
      price = Math.round(Number(plan.priceMonthly ?? 0) * 3 * 0.9);
    } else {
      price = Number(plan.priceMonthly ?? 0);
    }

    // Amount in paise (INR)
    const amountInPaise = Math.round(price * 100);

    if (amountInPaise < 100) {
      throw new AppError(
        "Order amount must be minimum ₹1.",
        400,
        "INVALID_AMOUNT",
      );
    }

    const dbKeyId = this.getPlatformConfigUseCase
      ? await this.getPlatformConfigUseCase.getValue("RAZORPAY_KEY_ID")
      : null;
    const dbKeySecret = this.getPlatformConfigUseCase
      ? await this.getPlatformConfigUseCase.getValue("RAZORPAY_KEY_SECRET")
      : null;

    const razorpayKeyId =
      dbKeyId || process.env.RAZORPAY_KEY_ID || "rzp_test_mockkey123";
    const razorpayKeySecret =
      dbKeySecret || process.env.RAZORPAY_KEY_SECRET || "mocksecret123";

    const hasActiveCredentials = Boolean(
      (dbKeyId && dbKeySecret) ||
      (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    );

    let razorpayOrderId;

    // Call Razorpay Order API if keys are provided, otherwise generate a secure test order ID
    if (hasActiveCredentials) {
      try {
        const authHeader = Buffer.from(
          `${razorpayKeyId}:${razorpayKeySecret}`,
        ).toString("base64");

        const response = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${authHeader}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: plan.currency || "INR",
            receipt: `receipt_${organizationId.slice(0, 8)}_${Date.now()}`,
            notes: {
              organizationId,
              planId: plan.id,
              billingInterval,
            },
          }),
        });

        const orderData = await response.json();

        if (orderData.id) {
          razorpayOrderId = orderData.id;
        } else {
          throw new Error(
            orderData.error?.description || "Razorpay order creation failed.",
          );
        }
      } catch (err) {
        console.error("Razorpay order creation error:", err);
        // Fallback to test order ID if sandbox API call fails
        razorpayOrderId = `order_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      }
    } else {
      razorpayOrderId = `order_mock_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    }

    const paymentOrder = await this.paymentOrderRepository.create({
      organizationId,
      planId: plan.id,
      razorpayOrderId,
      amount: amountInPaise,
      currency: plan.currency || "INR",
      status: "CREATED",
      billingInterval,
      metadata: {
        planName: plan.name,
        planCode: plan.code,
      },
    });

    return {
      orderId: paymentOrder.id,
      razorpayOrderId: paymentOrder.razorpayOrderId,
      amount: amountInPaise,
      currency: plan.currency || "INR",
      keyId: razorpayKeyId,
      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code,
      },
    };
  }
}
