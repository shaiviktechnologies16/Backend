import crypto from "crypto";
import { AppError } from "../../../../common/errors/AppError.js";

export class VerifyPaymentUseCase {
  constructor({
    paymentOrderRepository,
    entitlementService,
    getPlatformConfigUseCase,
    invoiceService,
  }) {
    this.paymentOrderRepository = paymentOrderRepository;
    this.entitlementService = entitlementService;
    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
    this.invoiceService = invoiceService;
  }

  async execute({
    organizationId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  }) {
    if (!razorpayOrderId) {
      throw new AppError(
        "Razorpay Order ID is required.",
        400,
        "INVALID_ORDER",
      );
    }

    const paymentOrder =
      await this.paymentOrderRepository.findByRazorpayOrderId(razorpayOrderId);

    if (!paymentOrder) {
      throw new AppError(
        "Payment order record not found.",
        404,
        "ORDER_NOT_FOUND",
      );
    }

    const dbKeySecret = this.getPlatformConfigUseCase
      ? await this.getPlatformConfigUseCase.getValue("RAZORPAY_KEY_SECRET")
      : null;

    const keySecret = dbKeySecret || process.env.RAZORPAY_KEY_SECRET;

    // Verify Razorpay HMAC-SHA256 signature if secret is configured
    if (keySecret && razorpayPaymentId && razorpaySignature) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (generatedSignature !== razorpaySignature) {
        await this.paymentOrderRepository.updateStatus(
          paymentOrder.id,
          "FAILED",
          {
            razorpayPaymentId,
            razorpaySignature,
          },
        );

        throw new AppError(
          "Payment signature verification failed.",
          400,
          "INVALID_SIGNATURE",
        );
      }
    }

    // Update payment order status to PAID
    await this.paymentOrderRepository.updateStatus(paymentOrder.id, "PAID", {
      razorpayPaymentId,
      razorpaySignature,
    });

    // Upgrade organization plan & subscription
    const updatedEntitlements =
      await this.entitlementService.changeSubscription(
        paymentOrder.organizationId || organizationId,
        paymentOrder.planId,
        paymentOrder.billingInterval,
      );

    // Trigger Invoice Generation & WhatsApp Delivery asynchronously
    if (this.invoiceService) {
      this.invoiceService
        .generateAndDeliverInvoice({
          organizationId: paymentOrder.organizationId || organizationId,
          paymentOrderId: paymentOrder.id,
          razorpayOrderId,
          razorpayPaymentId,
          planId: paymentOrder.planId,
          billingInterval: paymentOrder.billingInterval,
        })
        .catch((err) => {
          console.error("[INVOICE GENERATION BACKGROUND ERROR]", err.message);
        });
    }

    return {
      success: true,
      message: "Payment verified and subscription activated successfully.",
      entitlements: updatedEntitlements,
    };
  }
}
