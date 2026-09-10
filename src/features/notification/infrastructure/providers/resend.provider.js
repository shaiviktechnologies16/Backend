import { Resend } from "resend";

import envConfig from "../../../../config/env.config.js";
import { EmailProvider } from "../../domain/contracts/email.provider.js";

export class ResendProvider extends EmailProvider {
  constructor({ getPlatformConfigUseCase }) {
    super();

    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
    this.client = new Resend(envConfig.email.resendApiKey);
  }

  async send({ to, subject, html }) {
    const from =
      (await this.getPlatformConfigUseCase.getValue("EMAIL_FROM")) ||
      "AI Platform <onboarding@resend.dev>";

    const response = await this.client.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    console.log("RESEND RESPONSE:", {
      to,
      from,
      subject,
      data: response.data,
      error: response.error,
    });

    if (response.error) {
      throw new Error(`Resend failed: ${response.error.message}`);
    }

    return response.data;
  }

  async sendOrganizationInvitation(payload) {
    return this.send(payload);
  }

  async sendPasswordReset(payload) {
    return this.send(payload);
  }

  async sendWelcomeEmail(payload) {
    return this.send(payload);
  }
}
