export const createPaymentOrderValidator = (req, res, next) => {
  const { planId } = req.body || {};

  if (!planId || typeof planId !== "string") {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_PLAN_ID",
        message: "Plan ID is required.",
      },
    });
  }

  next();
};

export const verifyPaymentValidator = (req, res, next) => {
  const { razorpayOrderId } = req.body || {};

  if (!razorpayOrderId || typeof razorpayOrderId !== "string") {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_ORDER_ID",
        message: "Razorpay Order ID is required.",
      },
    });
  }

  next();
};
