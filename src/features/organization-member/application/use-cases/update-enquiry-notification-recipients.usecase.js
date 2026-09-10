import { AppError } from "../../../../common/errors/AppError.js";

export class UpdateEnquiryNotificationRecipientsUseCase {
  constructor({
    organizationMemberRepository,
    enquiryNotificationRecipientRepository,
  }) {
    this.organizationMemberRepository = organizationMemberRepository;
    this.enquiryNotificationRecipientRepository =
      enquiryNotificationRecipientRepository;
  }

  async execute({ organizationId, recipients }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    if (!Array.isArray(recipients)) {
      throw new AppError(
        "Recipients must be an array.",
        400,
        "INVALID_RECIPIENTS",
      );
    }

    const members =
      await this.organizationMemberRepository.findAllByOrganization(
        organizationId,
      );

    const memberMap = new Map(members.map((member) => [member.id, member]));

    const normalizedRecipients = recipients.map((recipient) => {
      const organizationMemberId = String(
        recipient?.organizationMemberId ?? "",
      ).trim();

      if (!organizationMemberId) {
        throw new AppError(
          "Organization member ID is required.",
          400,
          "ORGANIZATION_MEMBER_ID_REQUIRED",
        );
      }

      const member = memberMap.get(organizationMemberId);

      if (!member) {
        throw new AppError(
          "Organization member does not belong to this organization.",
          400,
          "INVALID_ORGANIZATION_MEMBER",
        );
      }

      const recipientPhoneNumber = String(
        recipient?.recipientPhoneNumber ?? "",
      ).trim();

      const enabled = Boolean(recipient?.enabled);

      if (enabled && !recipientPhoneNumber) {
        throw new AppError(
          "Recipient WhatsApp phone number is required.",
          400,
          "RECIPIENT_PHONE_NUMBER_REQUIRED",
        );
      }

      if (
        recipientPhoneNumber &&
        !/^\+[1-9]\d{7,14}$/.test(recipientPhoneNumber)
      ) {
        throw new AppError(
          "Invalid WhatsApp phone number format.",
          400,
          "INVALID_RECIPIENT_PHONE_NUMBER",
        );
      }

      if (
        recipient.channel &&
        String(recipient.channel).toUpperCase() !== "WHATSAPP"
      ) {
        throw new AppError(
          "Only WhatsApp notification channel is supported.",
          400,
          "UNSUPPORTED_NOTIFICATION_CHANNEL",
        );
      }

      return {
        organizationMemberId,
        recipientPhoneNumber,
        channel: "WHATSAPP",
        enabled,
      };
    });

    const uniqueMembers = new Set();

    for (const recipient of normalizedRecipients) {
      if (uniqueMembers.has(recipient.organizationMemberId)) {
        throw new AppError(
          "Duplicate organization member recipient found.",
          400,
          "DUPLICATE_RECIPIENT",
        );
      }

      uniqueMembers.add(recipient.organizationMemberId);
    }

    const uniqueNumbers = new Set();

    for (const recipient of normalizedRecipients) {
      if (!recipient.recipientPhoneNumber) {
        continue;
      }

      if (uniqueNumbers.has(recipient.recipientPhoneNumber)) {
        throw new AppError(
          "Duplicate WhatsApp recipient phone number found.",
          400,
          "DUPLICATE_RECIPIENT_PHONE_NUMBER",
        );
      }

      uniqueNumbers.add(recipient.recipientPhoneNumber);
    }

    const existing =
      await this.enquiryNotificationRecipientRepository.findAllByOrganization(
        organizationId,
      );

    const existingMap = new Map(
      existing
        .filter((recipient) => recipient.organizationMemberId)
        .map((recipient) => [recipient.organizationMemberId, recipient]),
    );

    const results = [];

    for (const recipient of normalizedRecipients) {
      const existingRecipient = existingMap.get(recipient.organizationMemberId);

      if (existingRecipient) {
        const updated =
          await this.enquiryNotificationRecipientRepository.update(
            existingRecipient.id,
            {
              recipientPhoneNumber: recipient.recipientPhoneNumber,
              channel: recipient.channel,
              enabled: recipient.enabled,
            },
          );

        results.push(updated);
      } else {
        const created =
          await this.enquiryNotificationRecipientRepository.create({
            organizationId,
            organizationMemberId: recipient.organizationMemberId,
            recipientPhoneNumber: recipient.recipientPhoneNumber,
            channel: recipient.channel,
            enabled: recipient.enabled,
          });

        results.push(created);
      }
    }

    const submittedMembers = new Set(
      normalizedRecipients.map((recipient) => recipient.organizationMemberId),
    );

    for (const existingRecipient of existing) {
      if (
        existingRecipient.channel === "WHATSAPP" &&
        existingRecipient.organizationMemberId &&
        !submittedMembers.has(existingRecipient.organizationMemberId) &&
        existingRecipient.enabled
      ) {
        const updated =
          await this.enquiryNotificationRecipientRepository.update(
            existingRecipient.id,
            {
              enabled: false,
            },
          );

        results.push(updated);
      }
    }

    return results;
  }
}
