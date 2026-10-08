import { WebhookRepositoryImpl } from "./infrastructure/repositories/webhook.repository.impl.js";
import { WebhookDispatcherService } from "./application/services/webhook-dispatcher.service.js";
import {
  CreateWebhookUseCase,
  GetOrganizationWebhooksUseCase,
  DeleteWebhookUseCase,
  TestPingWebhookUseCase,
} from "./application/use-cases/webhook.usecases.js";
import { createWebhookController } from "./presentation/controllers/webhook.controller.js";
import createWebhookRoutes from "./presentation/routes/webhook.routes.js";

export function createWebhookModule({ dataSource, authenticateJwt }) {
  const webhookRepository = new WebhookRepositoryImpl(dataSource);
  const webhookDispatcherService = new WebhookDispatcherService({
    webhookRepository,
  });

  const createWebhookUseCase = new CreateWebhookUseCase({ webhookRepository });
  const getOrganizationWebhooksUseCase = new GetOrganizationWebhooksUseCase({
    webhookRepository,
  });
  const deleteWebhookUseCase = new DeleteWebhookUseCase({ webhookRepository });
  const testPingWebhookUseCase = new TestPingWebhookUseCase({
    webhookRepository,
    webhookDispatcherService,
  });

  const controller = createWebhookController({
    createWebhookUseCase,
    getOrganizationWebhooksUseCase,
    deleteWebhookUseCase,
    testPingWebhookUseCase,
  });

  const routes = createWebhookRoutes({
    controller,
    authenticateJwt,
  });

  return {
    webhookRepository,
    webhookDispatcherService,
    createWebhookUseCase,
    getOrganizationWebhooksUseCase,
    deleteWebhookUseCase,
    testPingWebhookUseCase,
    controller,
    routes,
  };
}
