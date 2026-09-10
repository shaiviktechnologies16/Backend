import { AppError } from "../../../../common/errors/AppError.js";

export class SendLeadToWhatsappUseCase {
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

  async execute({ organizationId, lead }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    if (!lead) {
      throw new AppError(
        "Enquiry information is required.",
        400,
        "ENQUIRY_REQUIRED",
      );
    }

    if (!lead.phone) {
      throw new AppError(
        "Enquiry phone number is required.",
        400,
        "ENQUIRY_PHONE_REQUIRED",
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

    if (!recipients.length) {
      throw new AppError(
        "No enabled enquiry notification recipients found.",
        404,
        "ENQUIRY_NOTIFICATION_RECIPIENTS_NOT_FOUND",
      );
    }

    const message = this.buildMessage(lead);

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
        console.error("[SEND_LEAD_WHATSAPP_FAILED]", {
          recipientId: recipient.id,
          recipientNumber: recipient.recipientPhoneNumber,
          instanceName,
          error: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
          stack: error?.stack,
        });
        failed.push({
          recipientId: recipient.id,
          recipientNumber: recipient.recipientPhoneNumber,
          error: error.message || "Failed to send WhatsApp notification.",
        });
      }
    }

    if (!sent.length) {
      throw new AppError(
        "Failed to send enquiry notification to all configured recipients.",
        502,
        "ENQUIRY_WHATSAPP_NOTIFICATION_FAILED",
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

  buildMessage(lead) {
    return [
      "*NEW ENQUIRY*",
      "",
      "A new enquiry has been captured by your AI Agent.",
      "",
      "*Enquiry Details*",
      "",
      `Name        : ${lead.name || "Not provided"}`,
      `Phone       : ${lead.phone || "Not provided"}`,
      `Email       : ${lead.email || "Not provided"}`,
      `Requirement : ${lead.requirement || "Not provided"}`,
      "",
      `Source      : ${lead.source || "AI Agent"}`,
      `Status      : ${lead.status || "NEW"}`,
      "",
      "Please follow up with the enquiry.",
    ].join("\n");
  }
}
