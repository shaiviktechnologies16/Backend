import { asyncHandler } from "../../../../common/utils/asyncHandler.js";

export const createWebhookController = ({
  createWebhookUseCase,
  getOrganizationWebhooksUseCase,
  deleteWebhookUseCase,
  testPingWebhookUseCase,
}) => {
  return {
    createWebhook: asyncHandler(async (req, res) => {
      const organizationId =
        req.headers["x-organization-id"] || req.user?.organizationId;
      const { url, events } = req.body;

      const webhook = await createWebhookUseCase.execute({
        organizationId,
        url,
        events,
      });

      res.status(201).json({
        success: true,
        data: webhook,
      });
    }),

    getWebhooks: asyncHandler(async (req, res) => {
      const organizationId =
        req.headers["x-organization-id"] || req.user?.organizationId;

      const webhooks = await getOrganizationWebhooksUseCase.execute({
        organizationId,
      });

      res.status(200).json({
        success: true,
        data: webhooks,
      });
    }),

    deleteWebhook: asyncHandler(async (req, res) => {
      const organizationId =
        req.headers["x-organization-id"] || req.user?.organizationId;
      const { id } = req.params;

      await deleteWebhookUseCase.execute({
        id,
        organizationId,
      });

      res.status(200).json({
        success: true,
        message: "Webhook deleted successfully.",
      });
    }),

    testPing: asyncHandler(async (req, res) => {
      const organizationId =
        req.headers["x-organization-id"] || req.user?.organizationId;
      const { id } = req.params;

      const result = await testPingWebhookUseCase.execute({
        id,
        organizationId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    }),
  };
};
