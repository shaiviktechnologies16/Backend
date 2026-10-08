import { AppError } from "../../../../common/errors/AppError.js";

export class SendHandoverNotificationToWhatsappUseCase {
  constructor({
    platformWhatsappConnectionRepository,
    platformEvolutionWhatsappProvider,
    enquiryNotificationRecipientRepository,
  }) {
    this.platformWhatsappConnectionRepository =
      platformWhatsappConnectionRepository;

    this.platformEvolutionWhatsappProvider = platformEvolutionWhatsappProvider;

    this.enquiryNotificationRecipientRepository =
      enquiryNotificationRecipientRepository;
  }

  async execute({
    organizationId,
    conversationId,
    projectId,
    agentName,
    projectName,
    visitorId,
    lastMessage,
  }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    if (!conversationId) {
      throw new AppError(
        "Conversation ID is required.",
        400,
        "CONVERSATION_ID_REQUIRED",
      );
    }

    const connection =
      await this.platformWhatsappConnectionRepository.findConnectedEvolution();

    if (!connection) {
      throw new AppError(
        "No connected platform WhatsApp connection found.",
        404,
        "PLATFORM_WHATSAPP_CONNECTION_NOT_FOUND",
      );
    }

    const instanceName = connection.metadata?.evolution?.instanceName;

    if (!instanceName) {
      throw new AppError(
        "Evolution instance name is not configured for the platform WhatsApp connection.",
        500,
        "WHATSAPP_EVOLUTION_INSTANCE_NOT_FOUND",
      );
    }

    const recipients =
      await this.enquiryNotificationRecipientRepository.findEnabledByOrganizationAndChannel(
        organizationId,
        "WHATSAPP",
      );

    if (!recipients || !recipients.length) {
      throw new AppError(
        "No enabled enquiry notification recipients found.",
        404,
        "ENQUIRY_NOTIFICATION_RECIPIENTS_NOT_FOUND",
      );
    }

    const message = this.buildMessage({
      organizationId,
      conversationId,
      projectId,
      agentName,
      projectName,
      visitorId,
      lastMessage,
    });

    const sent = [];
    const failed = [];

    for (const recipient of recipients) {
      try {
        if (!recipient.recipientPhoneNumber) {
          failed.push({
            recipientId: recipient.id,
            error: "Recipient phone number is not configured.",
          });
          continue;
        }

        const recipientNumber = this.normalizePhoneNumber(
          recipient.recipientPhoneNumber,
        );

        const result = await this.platformEvolutionWhatsappProvider.sendText({
          instanceName,
          number: recipientNumber,
          text: message,
        });

        sent.push({
          recipientId: recipient.id,
          recipientNumber,
          message: result,
        });
      } catch (error) {
        console.error("[SEND_HANDOVER_WHATSAPP_FAILED]", {
          recipientId: recipient.id,
          recipientNumber: recipient.recipientPhoneNumber,
          instanceName,
          error: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
        });
        failed.push({
          recipientId: recipient.id,
          recipientNumber: recipient.recipientPhoneNumber,
          error:
            error.message || "Failed to send WhatsApp handover notification.",
        });
      }
    }

    if (!sent.length) {
      throw new AppError(
        "Failed to send handover notification to all configured recipients.",
        502,
        "HANDOVER_WHATSAPP_NOTIFICATION_FAILED",
      );
    }

    return {
      sent: true,
      connectionId: connection.id,
      instanceName,
      recipients: sent,
      failed,
    };
  }

  normalizePhoneNumber(phone) {
    const digits = String(phone).replace(/\D/g, "");

    if (digits.startsWith("91") && digits.length === 12) {
      return `+${digits}`;
    }

    if (digits.length === 10) {
      return `+91${digits}`;
    }

    return `+${digits}`;
  }

  buildMessage({
    organizationId,
    conversationId,
    projectId,
    agentName,
    projectName,
    visitorId,
    lastMessage,
  }) {
    const baseUrl = (
      process.env.FRONTEND_URL || "https://admin.shaiviktechnologies.in"
    ).replace(/\/$/, "");

    let conversationUrl = `${baseUrl}/workspace/${organizationId}/conversations`;
    const params = [];
    if (projectId) params.push(`projectId=${encodeURIComponent(projectId)}`);
    if (conversationId)
      params.push(`conversationId=${encodeURIComponent(conversationId)}`);

    if (params.length > 0) {
      conversationUrl += `?${params.join("&")}`;
    }

    return [
      "🚨 *AGENT SUPPORT REQUESTED*",
      "",
      "A visitor requested to speak with a support agent.",
      "",
      "*Details*",
      `Agent     : ${agentName || "AI Support Agent"}`,
      `Project   : ${projectName || "Workspace Project"}`,
      `Visitor   : ${visitorId || "Public Visitor"}`,
      `Message   : "${lastMessage || "I want to talk to an agent."}"`,
      "",
      "*Open Conversation in Workspace:*",
      conversationUrl,
      "",
      "Click the link above to view and respond to the visitor.",
    ].join("\n");
  }
}
