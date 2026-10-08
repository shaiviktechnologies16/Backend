import { createHmac } from "crypto";

export class WebhookDispatcherService {
  constructor({ webhookRepository }) {
    this.webhookRepository = webhookRepository;
  }

  generateSignature(payload, secret) {
    const jsonPayload =
      typeof payload === "string" ? payload : JSON.stringify(payload);
    return `sha256=${createHmac("sha256", secret).update(jsonPayload).digest("hex")}`;
  }

  async dispatch(organizationId, event, dataPayload) {
    if (!organizationId || !event) return [];

    const webhooks =
      await this.webhookRepository.findActiveByOrganizationAndEvent(
        organizationId,
        event,
      );

    if (!webhooks || webhooks.length === 0) {
      return [];
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data: dataPayload,
    };

    const payloadString = JSON.stringify(payload);

    const dispatchPromises = webhooks.map(async (webhook) => {
      const signature = this.generateSignature(payloadString, webhook.secret);
      const startTime = Date.now();

      let responseStatus = null;
      let responseBody = null;
      let status = "FAILED";

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shaivik-Event": event,
            "X-Shaivik-Signature": signature,
            "User-Agent": "Shaivik-AI-Webhook/1.0",
          },
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        responseStatus = response.status;
        const text = await response.text();
        responseBody = text.slice(0, 1000); // Truncate response body preview

        if (response.ok) {
          status = "SUCCESS";
        }
      } catch (err) {
        responseBody = err.message || "Failed to deliver webhook payload";
      } finally {
        const durationMs = Date.now() - startTime;

        await this.webhookRepository
          .recordDelivery({
            webhookId: webhook.id,
            event,
            payload,
            responseStatus,
            responseBody,
            status,
            durationMs,
          })
          .catch((err) => {
            console.error("[WEBHOOK DELIVERY LOG ERROR]", err);
          });
      }

      return {
        webhookId: webhook.id,
        status,
        responseStatus,
      };
    });

    return Promise.all(dispatchPromises);
  }
}
