import { randomBytes } from "crypto";
import { AppError } from "../../../../common/errors/AppError.js";
import { Webhook } from "../../domain/entities/webhook.entity.js";

export class CreateWebhookUseCase {
  constructor({ webhookRepository }) {
    this.webhookRepository = webhookRepository;
  }

  async execute({
    organizationId,
    url,
    events = ["lead.created", "conversation.ended", "handover.requested"],
  }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    if (!url || !url.startsWith("http")) {
      throw new AppError(
        "Valid HTTP/HTTPS webhook URL is required.",
        400,
        "INVALID_WEBHOOK_URL",
      );
    }

    const secret = `whsec_${randomBytes(24).toString("hex")}`;

    const webhook = new Webhook({
      organizationId,
      url,
      secret,
      events,
      isActive: true,
    });

    return this.webhookRepository.create(webhook);
  }
}

export class GetOrganizationWebhooksUseCase {
  constructor({ webhookRepository }) {
    this.webhookRepository = webhookRepository;
  }

  async execute({ organizationId }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    return this.webhookRepository.findByOrganizationId(organizationId);
  }
}

export class DeleteWebhookUseCase {
  constructor({ webhookRepository }) {
    this.webhookRepository = webhookRepository;
  }

  async execute({ id, organizationId }) {
    const existing = await this.webhookRepository.findById(id);

    if (!existing) {
      throw new AppError("Webhook not found.", 404, "WEBHOOK_NOT_FOUND");
    }

    if (existing.organizationId !== organizationId) {
      throw new AppError(
        "Unauthorized webhook deletion.",
        403,
        "UNAUTHORIZED_WEBHOOK_ACCESS",
      );
    }

    await this.webhookRepository.delete(id);
  }
}

export class TestPingWebhookUseCase {
  constructor({ webhookRepository, webhookDispatcherService }) {
    this.webhookRepository = webhookRepository;
    this.webhookDispatcherService = webhookDispatcherService;
  }

  async execute({ id, organizationId }) {
    const webhook = await this.webhookRepository.findById(id);

    if (!webhook) {
      throw new AppError("Webhook not found.", 404, "WEBHOOK_NOT_FOUND");
    }

    if (webhook.organizationId !== organizationId) {
      throw new AppError(
        "Unauthorized webhook access.",
        403,
        "UNAUTHORIZED_WEBHOOK_ACCESS",
      );
    }

    const testPayload = {
      message: "Shaivik-AI Webhook Ping Test",
      webhookId: webhook.id,
      organizationId: webhook.organizationId,
    };

    const results = await this.webhookDispatcherService.dispatch(
      organizationId,
      "ping.test",
      testPayload,
    );

    return {
      success: true,
      message: "Test ping dispatched.",
      results,
    };
  }
}
