export class PaymentController {
  constructor({
    createPaymentOrderUseCase,
    verifyPaymentUseCase,
    handleRazorpayWebhookUseCase,
  }) {
    this.createPaymentOrderUseCase = createPaymentOrderUseCase;
    this.verifyPaymentUseCase = verifyPaymentUseCase;
    this.handleRazorpayWebhookUseCase = handleRazorpayWebhookUseCase;
  }

  createOrder = async (req, res, next) => {
    try {
      const organizationId =
        req.body?.organizationId ||
        req.params?.organizationId ||
        req.context?.organizationId ||
        req.user?.organizationId;

      const { planId, billingInterval, amount, currency, receipt, notes } =
        req.body || {};

      const result = await this.createPaymentOrderUseCase.execute({
        organizationId,
        planId,
        billingInterval,
        amount,
        currency,
        receipt,
        notes,
      });

      res.status(201).json({
        success: true,
        order_id: result.order_id,
        amount: result.amount,
        currency: result.currency,
        key_id: result.key_id,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  verifyPayment = async (req, res, next) => {
    try {
      const organizationId =
        req.body?.organizationId ||
        req.params?.organizationId ||
        req.context?.organizationId ||
        req.user?.organizationId;

      const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        order_id,
        payment_id,
        razorpay_signature,
        signature,
      } = req.body || {};

      const result = await this.verifyPaymentUseCase.execute({
        organizationId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        order_id,
        payment_id,
        razorpay_signature,
        signature,
      });

      res.json({
        success: true,
        message: result.message || "Payment verified successfully",
        order_id: result.order_id,
        payment_id: result.payment_id,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  webhook = async (req, res, next) => {
    try {
      const signature = req.headers["x-razorpay-signature"];
      const rawBody =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);

      const result = await this.handleRazorpayWebhookUseCase.execute({
        rawBody,
        signature,
        payload: req.body,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
