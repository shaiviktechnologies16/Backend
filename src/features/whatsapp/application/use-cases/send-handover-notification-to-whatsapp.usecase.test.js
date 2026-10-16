import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SendHandoverNotificationToWhatsappUseCase } from "./send-handover-notification-to-whatsapp.usecase.js";

describe("SendHandoverNotificationToWhatsappUseCase", () => {
  it("formats handover message and sends WhatsApp text to enabled recipients", async () => {
    let sentPayload = null;

    const mockPlatformRepo = {
      findConnectedEvolution: async () => ({
        id: "conn-123",
        metadata: {
          evolution: {
            instanceName: "inst-handover-test",
          },
        },
      }),
    };

    const mockProvider = {
      sendText: async (payload) => {
        sentPayload = payload;
        return { messageId: "msg-999" };
      },
    };

    const mockRecipientRepo = {
      findEnabledByOrganizationAndChannel: async (orgId, channel) => [
        {
          id: "rec-1",
          recipientPhoneNumber: "9876543210",
        },
      ],
    };

    const useCase = new SendHandoverNotificationToWhatsappUseCase({
      platformWhatsappConnectionRepository: mockPlatformRepo,
      platformEvolutionWhatsappProvider: mockProvider,
      enquiryNotificationRecipientRepository: mockRecipientRepo,
    });

    const result = await useCase.execute({
      organizationId: "org-test-123",
      conversationId: "conv-test-456",
      projectId: "proj-test-789",
      agentName: "Support Bot",
      projectName: "Main Website",
      visitorId: "vis-101",
      lastMessage: "I need human support immediately.",
    });

    assert.equal(result.sent, true);
    assert.equal(result.instanceName, "inst-handover-test");
    assert.equal(sentPayload.number, "919876543210");
    assert.match(
      sentPayload.text,
      /AGENT SUPPORT REQUESTED|HUMAN SUPPORT REQUESTED/,
    );
    assert.match(
      sentPayload.text,
      /https:\/\/admin\.shaiviktechnologies\.in\/workspace\/org-test-123\/conversations\?projectId=proj-test-789&conversationId=conv-test-456/,
    );
    assert.match(sentPayload.text, /I need human support immediately\./);
  });

  it("includes lead information in WhatsApp notification when provided", async () => {
    let sentPayload = null;

    const mockPlatformRepo = {
      findConnectedEvolution: async () => ({
        id: "conn-123",
        metadata: {
          evolution: {
            instanceName: "inst-handover-test",
          },
        },
      }),
    };

    const mockProvider = {
      sendText: async (payload) => {
        sentPayload = payload;
        return { messageId: "msg-100" };
      },
    };

    const mockRecipientRepo = {
      findEnabledByOrganizationAndChannel: async () => [
        {
          id: "rec-1",
          recipientPhoneNumber: "+919010510476",
        },
      ],
    };

    const useCase = new SendHandoverNotificationToWhatsappUseCase({
      platformWhatsappConnectionRepository: mockPlatformRepo,
      platformEvolutionWhatsappProvider: mockProvider,
      enquiryNotificationRecipientRepository: mockRecipientRepo,
    });

    const result = await useCase.execute({
      organizationId: "org-test-123",
      conversationId: "conv-test-456",
      projectId: "proj-test-789",
      agentName: "Support Bot",
      projectName: "Main Website",
      visitorId: "vis-101",
      lastMessage: "Please connect me to an agent",
      lead: {
        name: "Rakesh",
        phone: "9010510476",
        email: "rakesh@example.com",
        requirement: "Need website development",
      },
    });

    assert.equal(result.sent, true);
    assert.equal(sentPayload.number, "919010510476");
    assert.match(sentPayload.text, /Name\s*:\s*Rakesh/);
    assert.match(sentPayload.text, /Phone\s*:\s*9010510476/);
    assert.match(sentPayload.text, /Email\s*:\s*rakesh@example\.com/);
    assert.match(sentPayload.text, /Enquiry\s*:\s*Need website development/);
  });

  it("throws error when organizationId or conversationId is missing", async () => {
    const useCase = new SendHandoverNotificationToWhatsappUseCase({});

    await assert.rejects(
      async () => {
        await useCase.execute({ conversationId: "conv-1" });
      },
      (err) => err.errorCode === "ORGANIZATION_ID_REQUIRED",
    );

    await assert.rejects(
      async () => {
        await useCase.execute({ organizationId: "org-1" });
      },
      (err) => err.errorCode === "CONVERSATION_ID_REQUIRED",
    );
  });

  it("throws HANDOVER_WHATSAPP_NOTIFICATION_FAILED (502) when delivery fails to all recipients", async () => {
    const mockPlatformRepo = {
      findConnectedEvolution: async () => ({
        id: "conn-123",
        metadata: { evolution: { instanceName: "inst-handover-test" } },
      }),
    };

    const mockProvider = {
      sendText: async () => {
        throw new Error("Evolution API network error");
      },
    };

    const mockRecipientRepo = {
      findEnabledByOrganizationAndChannel: async () => [
        { id: "rec-1", recipientPhoneNumber: "9876543210" },
      ],
    };

    const useCase = new SendHandoverNotificationToWhatsappUseCase({
      platformWhatsappConnectionRepository: mockPlatformRepo,
      platformEvolutionWhatsappProvider: mockProvider,
      enquiryNotificationRecipientRepository: mockRecipientRepo,
    });

    await assert.rejects(
      async () => {
        await useCase.execute({
          organizationId: "org-1",
          conversationId: "conv-1",
          lastMessage: "help",
        });
      },
      (err) =>
        err.statusCode === 502 &&
        err.errorCode === "HANDOVER_WHATSAPP_NOTIFICATION_FAILED",
    );
  });
});
