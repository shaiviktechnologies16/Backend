import { Router } from "express";
import {
  createPaymentOrderValidator,
  verifyPaymentValidator,
} from "../validators/payment.validator.js";

export function createPaymentRoutes({ paymentController, authMiddleware }) {
  const router = Router();

  router.post("/webhook", paymentController.webhook);

  if (authMiddleware) {
    router.use(authMiddleware);
  }

  router.post(
    "/create-order",
    createPaymentOrderValidator,
    paymentController.createOrder,
  );

  router.post(
    "/verify",
    verifyPaymentValidator,
    paymentController.verifyPayment,
  );

  return router;
}
