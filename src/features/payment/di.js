import { PaymentOrderRepositoryImpl } from "./infrastructure/repositories/payment-order.repository.impl.js";
import { CreatePaymentOrderUseCase } from "./application/use-cases/create-payment-order.usecase.js";
import { VerifyPaymentUseCase } from "./application/use-cases/verify-payment.usecase.js";
import { HandleRazorpayWebhookUseCase } from "./application/use-cases/handle-razorpay-webhook.usecase.js";
import { PaymentController } from "./presentation/controllers/payment.controller.js";

export function createPaymentModule({
  dataSource,
  planRepository,
  entitlementService,
  getPlatformConfigUseCase,
  invoiceService,
}) {
  const paymentOrderRepository = new PaymentOrderRepositoryImpl(dataSource);

  const createPaymentOrderUseCase = new CreatePaymentOrderUseCase({
    planRepository,
    paymentOrderRepository,
    getPlatformConfigUseCase,
    entitlementService,
  });

  const verifyPaymentUseCase = new VerifyPaymentUseCase({
    paymentOrderRepository,
    entitlementService,
    getPlatformConfigUseCase,
    invoiceService,
  });

  const handleRazorpayWebhookUseCase = new HandleRazorpayWebhookUseCase({
    paymentOrderRepository,
    entitlementService,
    invoiceService,
  });

  const paymentController = new PaymentController({
    createPaymentOrderUseCase,
    verifyPaymentUseCase,
    handleRazorpayWebhookUseCase,
  });

  return {
    paymentOrderRepository,
    createPaymentOrderUseCase,
    verifyPaymentUseCase,
    handleRazorpayWebhookUseCase,
    paymentController,
  };
}
