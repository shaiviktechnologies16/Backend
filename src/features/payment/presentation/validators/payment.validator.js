export const createPaymentOrderValidator = (req, res, next) => {
  const { amount, currency, planId } = req.body || {};

  // If amount is provided (Standard Checkout)
  if (amount !== undefined && amount !== null) {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_AMOUNT",
          message: "Amount must be at least 100 paise (₹1).",
        },
      });
    }

    if (currency !== undefined && currency !== null) {
      if (typeof currency !== "string" || currency.trim().length !== 3) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CURRENCY",
            message: "Currency must be a valid 3-letter code (e.g., INR, USD).",
          },
        });
      }
    }

    return next();
  }

  // If planId is provided (Subscription Checkout)
  if (planId && typeof planId === "string") {
    return next();
  }

  return res.status(400).json({
    success: false,
    error: {
      code: "INVALID_REQUEST",
      message: "Either amount (minimum 100 paise) or planId is required.",
    },
  });
};

export const verifyPaymentValidator = (req, res, next) => {
  const body = req.body || {};
  const orderId = body.order_id || body.razorpayOrderId || body.razorpay_order_id;
  const paymentId = body.payment_id || body.razorpayPaymentId || body.razorpay_payment_id;
  const signature = body.razorpay_signature || body.razorpaySignature || body.signature;

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({
      success: false,
      error: {
        code: "MISSING_FIELDS",
        message:
          "Missing required payment verification fields: order_id, payment_id, and razorpay_signature are required.",
      },
    });
  }

  next();
};

