import { AppError } from "../../../../common/errors/AppError.js";

export class GetEnquiryNotificationRecipientsUseCase {
  constructor({
    organizationMemberRepository,
    enquiryNotificationRecipientRepository,
  }) {
    this.organizationMemberRepository = organizationMemberRepository;
    this.enquiryNotificationRecipientRepository =
      enquiryNotificationRecipientRepository;
  }

  async execute({ organizationId }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    const members =
      await this.organizationMemberRepository.findAllByOrganization(
        organizationId,
      );

    const recipients =
      await this.enquiryNotificationRecipientRepository.findAllByOrganization(
        organizationId,
      );

    const recipientMap = new Map(
      recipients
        .filter((recipient) => recipient.organizationMemberId)
        .map((recipient) => [recipient.organizationMemberId, recipient]),
    );

    return members.map((member) => {
      const recipient = recipientMap.get(member.id);

      return {
        organizationMemberId: member.id,
        userId: member.userId,
        fullName: member.fullName,
        email: member.email,
        role: member.role,
        recipientPhoneNumber: recipient?.recipientPhoneNumber ?? "",
        channel: recipient?.channel ?? "WHATSAPP",
        enabled: recipient?.enabled ?? false,
      };
    });
  }
}
