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
    order_id,
    payment_id,
    razorpay_signature,
    signature,
  }) {
    const finalOrderId = razorpayOrderId || order_id;
    const finalPaymentId = razorpayPaymentId || payment_id;
    const finalSignature = razorpaySignature || razorpay_signature || signature;

    if (!finalOrderId || !finalPaymentId || !finalSignature) {
      throw new AppError(
        "Missing required payment verification fields (order_id, payment_id, razorpay_signature).",
        400,
        "MISSING_FIELDS",
      );
    }

    let paymentOrder = null;
    if (this.paymentOrderRepository) {
      paymentOrder = await this.paymentOrderRepository.findByRazorpayOrderId(finalOrderId);
    }

    // Check for replay attacks / duplicate verification
    if (paymentOrder && paymentOrder.status === "PAID") {
      return {
        success: true,
        message: "Payment already verified and processed.",
        order_id: finalOrderId,
        payment_id: finalPaymentId,
        orderId: paymentOrder.id,
      };
    }

    let dbKeySecret = this.getPlatformConfigUseCase
      ? await this.getPlatformConfigUseCase.getValue("RAZORPAY_KEY_SECRET")
      : null;

    if (dbKeySecret && (dbKeySecret === "YOUR_RAZORPAY_TEST_SECRET" || dbKeySecret.trim() === "")) {
      dbKeySecret = null;
    }

    const keySecret =
      dbKeySecret ||
      process.env.RAZORPAY_KEY_SECRET ||
      (process.env.NODE_ENV === "test" ? "test_razorpay_secret" : null);

    if (!keySecret) {
      throw new AppError(
        "Razorpay key secret is not configured for signature verification.",
        500,
        "RAZORPAY_SECRET_MISSING",
      );
    }

    // Verify Razorpay HMAC-SHA256 signature
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${finalOrderId}|${finalPaymentId}`)
      .digest("hex");

    if (generatedSignature !== finalSignature) {
      if (paymentOrder) {
        await this.paymentOrderRepository.updateStatus(
          paymentOrder.id,
          "FAILED",
          {
            razorpayPaymentId: finalPaymentId,
            razorpaySignature: finalSignature,
          },
        );
      }

      throw new AppError(
        "Payment signature verification failed.",
        400,
        "INVALID_SIGNATURE",
      );
    }

    let updatedEntitlements = null;

    // Update payment order status to PAID if record exists
    if (paymentOrder) {
      await this.paymentOrderRepository.updateStatus(paymentOrder.id, "PAID", {
        razorpayPaymentId: finalPaymentId,
        razorpaySignature: finalSignature,
      });

      // Upgrade organization plan & subscription if applicable
      if (this.entitlementService && paymentOrder.planId) {
        updatedEntitlements = await this.entitlementService.changeSubscription(
          paymentOrder.organizationId || organizationId,
          paymentOrder.planId,
          paymentOrder.billingInterval,
        );
      }

      // Trigger Invoice Generation & WhatsApp Delivery asynchronously
      if (this.invoiceService) {
        this.invoiceService
          .generateAndDeliverInvoice({
            organizationId: paymentOrder.organizationId || organizationId,
            paymentOrderId: paymentOrder.id,
            razorpayOrderId: finalOrderId,
            razorpayPaymentId: finalPaymentId,
            planId: paymentOrder.planId,
            billingInterval: paymentOrder.billingInterval,
          })
          .catch((err) => {
            console.error("[INVOICE GENERATION BACKGROUND ERROR]", err.message);
          });
      }
    }

    return {
      success: true,
      message: "Payment verified successfully",
      order_id: finalOrderId,
      payment_id: finalPaymentId,
      orderId: paymentOrder?.id || finalOrderId,
      entitlements: updatedEntitlements,
    };
  }
}
