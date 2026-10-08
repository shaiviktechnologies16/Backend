import test from "node:test";
import assert from "node:assert/strict";
import { WebhookDispatcherService } from "./webhook-dispatcher.service.js";

test("WebhookDispatcherService correctly generates HMAC-SHA256 signatures", () => {
  const dispatcher = new WebhookDispatcherService({ webhookRepository: null });
  const secret = "whsec_test_secret_key_123456789";
  const payload = { event: "lead.created", data: { id: "lead-123" } };

  const signature = dispatcher.generateSignature(payload, secret);

  assert.ok(signature.startsWith("sha256="));
  assert.equal(signature.length, 71); // 'sha256=' (7) + 64 hex characters
});

test("WebhookDispatcherService dispatches event and computes signature header", async () => {
  const mockWebhook = {
    id: "wh-123",
    organizationId: "org-100",
    url: "https://example.com/webhook",
    secret: "whsec_supersecret",
    events: ["lead.created"],
    isActive: true,
  };

  const recordedDeliveries = [];
  const mockWebhookRepository = {
    async findActiveByOrganizationAndEvent(orgId, event) {
      if (orgId === "org-100" && event === "lead.created") {
        return [mockWebhook];
      }
      return [];
    },
    async recordDelivery(deliveryData) {
      recordedDeliveries.push(deliveryData);
    },
  };

  const dispatcher = new WebhookDispatcherService({
    webhookRepository: mockWebhookRepository,
  });

  // Mock global fetch for test execution
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.equal(url, "https://example.com/webhook");
    assert.ok(options.headers["X-Shaivik-Signature"].startsWith("sha256="));
    assert.equal(options.headers["X-Shaivik-Event"], "lead.created");

    return {
      ok: true,
      status: 200,
      async text() {
        return '{"received":true}';
      },
    };
  };

  try {
    const results = await dispatcher.dispatch("org-100", "lead.created", {
      leadId: "lead-999",
      name: "John Doe",
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].status, "SUCCESS");
    assert.equal(recordedDeliveries.length, 1);
    assert.equal(recordedDeliveries[0].status, "SUCCESS");
  } finally {
    global.fetch = originalFetch;
  }
});
