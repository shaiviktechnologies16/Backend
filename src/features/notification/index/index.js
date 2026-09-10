import { EmailService } from "../application/services/email.service.js";
import { ResendProvider } from "../infrastructure/providers/resend.provider.js";

export const createEmailService = ({ getPlatformConfigUseCase }) => {
  const emailProvider = new ResendProvider({
    getPlatformConfigUseCase,
  });

  return new EmailService(emailProvider, getPlatformConfigUseCase);
};
