export class EmailProvider {
  async send() {
    throw new Error("send() must be implemented.");
  }

  async sendOrganizationInvitation() {
    throw new Error("sendOrganizationInvitation() must be implemented.");
  }

  async sendPasswordReset() {
    throw new Error("sendPasswordReset() must be implemented.");
  }

  async sendWelcomeEmail() {
    throw new Error("sendWelcomeEmail() must be implemented.");
  }
}
