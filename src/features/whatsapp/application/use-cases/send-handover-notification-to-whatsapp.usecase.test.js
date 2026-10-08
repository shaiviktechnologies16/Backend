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
    assert.equal(sentPayload.number, "+919876543210");
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
});
