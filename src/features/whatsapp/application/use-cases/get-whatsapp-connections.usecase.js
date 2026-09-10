import { AppError } from "../../../../common/errors/AppError.js";

export class GetWhatsappConnectionsUseCase {
  constructor({ whatsappConnectionRepository }) {
    this.whatsappConnectionRepository = whatsappConnectionRepository;
  }

  async execute({ organizationId }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    return await this.whatsappConnectionRepository.findByOrganizationId(
      organizationId,
    );
  }
}
