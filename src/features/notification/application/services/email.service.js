import { organizationInvitationTemplate } from "../../infrastructure/templates/organization-invitation.template.js";
import { memberWelcomeTemplate } from "../../infrastructure/templates/welcome.template.js";

export class EmailService {
  constructor(emailProvider, getPlatformConfigUseCase) {
    this.emailProvider = emailProvider;
    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
  }

  async sendOrganizationInvitation({
    email,
    organizationName,
    inviterName,
    invitationToken,
    role = "MEMBER",
  }) {
    const frontendUrl =
      await this.getPlatformConfigUseCase.getValue("FRONTEND_URL");

    const invitationUrl = `${frontendUrl}/invitation/accept?token=${invitationToken}`;

    const { subject, html } = organizationInvitationTemplate({
      organizationName,
      inviterName,
      invitationUrl,
      role,
    });

    return this.emailProvider.sendOrganizationInvitation({
      to: email,
      subject,
      html,
    });
  }

  async sendPasswordReset({ email, subject, html }) {
    return this.emailProvider.sendPasswordReset({
      to: email,
      subject,
      html,
    });
  }

  async sendWelcomeEmail({ email, organizationName, inviterName, role }) {
    const { subject, html } = memberWelcomeTemplate({
      organizationName,
      inviterName,
      role,
    });

    return this.emailProvider.sendWelcomeEmail({
      to: email,
      subject,
      html,
    });
  }
}
