import crypto from "crypto";

export class HandleRazorpayWebhookUseCase {
  constructor({ paymentOrderRepository, entitlementService, invoiceService }) {
    this.paymentOrderRepository = paymentOrderRepository;
    this.entitlementService = entitlementService;
    this.invoiceService = invoiceService;
  }

  async execute({ rawBody, signature, payload }) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        throw new Error("Invalid Razorpay webhook signature.");
      }
    }

    const event = payload?.event;
    const entity =
      payload?.payload?.payment?.entity || payload?.payload?.order?.entity;

    if (!entity) {
      return { status: "ignored" };
    }

    const razorpayOrderId = entity.order_id || entity.id;

    if (["payment.captured", "order.paid"].includes(event) && razorpayOrderId) {
      const paymentOrder =
        await this.paymentOrderRepository.findByRazorpayOrderId(
          razorpayOrderId,
        );

      if (paymentOrder) {
        if (paymentOrder.status !== "PAID") {
          await this.paymentOrderRepository.updateStatus(
            paymentOrder.id,
            "PAID",
            {
              razorpayPaymentId: entity.id,
              metadata: payload,
            },
          );

          await this.entitlementService.changeSubscription(
            paymentOrder.organizationId,
            paymentOrder.planId,
            paymentOrder.billingInterval,
          );
        }

        // Trigger Invoice Generation & WhatsApp Delivery asynchronously (idempotent)
        if (this.invoiceService) {
          this.invoiceService
            .generateAndDeliverInvoice({
              organizationId: paymentOrder.organizationId,
              paymentOrderId: paymentOrder.id,
              razorpayOrderId: paymentOrder.razorpayOrderId,
              razorpayPaymentId: entity.id,
              planId: paymentOrder.planId,
              billingInterval: paymentOrder.billingInterval,
            })
            .catch((err) => {
              console.error("[INVOICE WEBHOOK BACKGROUND ERROR]", err.message);
            });
        }
      }
    }

    return { status: "processed", event };
  }
}
