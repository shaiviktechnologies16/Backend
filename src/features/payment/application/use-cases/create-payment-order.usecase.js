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

  async execute({
    organizationId,
    planId,
    billingInterval = "MONTHLY",
    amount,
    currency,
    receipt,
    notes = {},
  }) {
    let amountInPaise;
    let orderCurrency = currency || "INR";
    let plan = null;
    let receiptId = receipt || `rcpt_${Date.now()}`;

    // Mode 1: Direct amount checkout (Standard Checkout)
    if (amount !== undefined && amount !== null) {
      amountInPaise = Math.round(Number(amount));
      if (isNaN(amountInPaise) || amountInPaise < 100) {
        throw new AppError(
          "Order amount must be at least 100 paise (₹1).",
          400,
          "INVALID_AMOUNT",
        );
      }

      if (
        currency &&
        (typeof currency !== "string" || currency.trim().length !== 3)
      ) {
        throw new AppError(
          "Currency must be a valid 3-letter code (e.g., INR, USD).",
          400,
          "INVALID_CURRENCY",
        );
      }
      orderCurrency = (currency || "INR").toUpperCase();
    } else {
      // Mode 2: Subscription checkout with planId
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

      if (!this.planRepository) {
        throw new AppError(
          "Plan repository not available.",
          500,
          "INTERNAL_ERROR",
        );
      }

      plan = await this.planRepository.findById(planId);
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

      amountInPaise = Math.round(price * 100);
      orderCurrency = plan.currency || "INR";
      receiptId = `receipt_${organizationId.slice(0, 8)}_${Date.now()}`;
      notes = {
        organizationId,
        planId: plan.id,
        billingInterval,
        ...notes,
      };

      if (amountInPaise < 100) {
        throw new AppError(
          "Order amount must be minimum ₹1 (100 paise).",
          400,
          "INVALID_AMOUNT",
        );
      }
    }

    let dbKeyId = this.getPlatformConfigUseCase
      ? await this.getPlatformConfigUseCase.getValue("RAZORPAY_KEY_ID")
      : null;

    let dbKeySecret = this.getPlatformConfigUseCase
      ? await this.getPlatformConfigUseCase.getValue("RAZORPAY_KEY_SECRET")
      : null;

    // Filter out dummy/placeholder values
    if (
      dbKeySecret &&
      (dbKeySecret === "YOUR_RAZORPAY_TEST_SECRET" || dbKeySecret.trim() === "")
    ) {
      dbKeySecret = null;
    }
    if (
      dbKeyId &&
      (dbKeyId === "YOUR_RAZORPAY_KEY_ID" || dbKeyId.trim() === "")
    ) {
      dbKeyId = null;
    }

    const razorpayKeyId = dbKeyId || process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = dbKeySecret || process.env.RAZORPAY_KEY_SECRET;

    let razorpayOrderId;

    // If credentials are not set (e.g. in test environment)
    if (!razorpayKeyId || !razorpayKeySecret) {
      if (process.env.NODE_ENV === "test" || !process.env.RAZORPAY_KEY_ID) {
        razorpayOrderId = `order_mock_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      } else {
        throw new AppError(
          "Razorpay credentials are not configured.",
          500,
          "RAZORPAY_CREDENTIALS_MISSING",
        );
      }
    } else {
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
            currency: orderCurrency,
            receipt: receiptId,
            notes,
          }),
        });

        const orderData = await response.json();

        if (response.status === 401) {
          console.error("Razorpay API auth error:", {
            status: response.status,
            error: orderData?.error,
          });

          throw new AppError(
            orderData?.error?.description ||
              "Authentication failed with Razorpay API.",
            401,
            "AUTHENTICATION_FAILED",
          );
        }

        if (!response.ok) {
          console.error("Razorpay API error:", {
            status: response.status,
            error: orderData?.error,
          });

          throw new AppError(
            orderData?.error?.description || "Razorpay order creation failed.",
            500,
            "RAZORPAY_API_ERROR",
          );
        }

        if (!orderData?.id) {
          throw new AppError(
            "Razorpay did not return an order ID.",
            502,
            "RAZORPAY_ORDER_ID_MISSING",
          );
        }

        razorpayOrderId = orderData.id;
      } catch (err) {
        if (err instanceof AppError) {
          throw err;
        }
        console.error("Razorpay order creation error:", err);
        throw new AppError(
          err.message || "Failed to communicate with Razorpay API.",
          500,
          "RAZORPAY_NETWORK_ERROR",
        );
      }
    }

    let paymentOrder = null;
    if (this.paymentOrderRepository && organizationId && plan) {
      try {
        paymentOrder = await this.paymentOrderRepository.create({
          organizationId,
          planId: plan.id,
          razorpayOrderId,
          amount: amountInPaise,
          currency: orderCurrency,
          status: "CREATED",
          billingInterval,
          metadata: {
            planName: plan.name,
            planCode: plan.code,
          },
        });
      } catch (dbErr) {
        console.warn(
          "Could not save payment order to database:",
          dbErr.message,
        );
      }
    }

    return {
      order_id: razorpayOrderId,
      amount: amountInPaise,
      currency: orderCurrency,
      key_id: razorpayKeyId || "rzp_test_mockkey123",
      orderId: paymentOrder?.id || razorpayOrderId,
      razorpayOrderId,
      receipt: receiptId,
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            code: plan.code,
          }
        : null,
    };
  }
}
