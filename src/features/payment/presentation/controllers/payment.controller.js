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
        req.body.organizationId ||
        req.params.organizationId ||
        req.context?.organizationId ||
        req.user?.organizationId;

      const { planId, billingInterval } = req.body;

      const result = await this.createPaymentOrderUseCase.execute({
        organizationId,
        planId,
        billingInterval,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  verifyPayment = async (req, res, next) => {
    try {
      const organizationId =
        req.body.organizationId ||
        req.params.organizationId ||
        req.context?.organizationId ||
        req.user?.organizationId;

      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
        req.body;

      const result = await this.verifyPaymentUseCase.execute({
        organizationId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      res.json({
        success: true,
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
