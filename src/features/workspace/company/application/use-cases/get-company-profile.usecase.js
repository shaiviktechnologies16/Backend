import { AppError } from "../../../../../common/errors/AppError.js";

export class GetCompanyProfileUseCase {
  constructor({ companyProfileRepository, organizationRepository = null }) {
    this.companyProfileRepository = companyProfileRepository;
    this.organizationRepository = organizationRepository;
  }

  async execute(organizationId) {
    let companyProfile =
      await this.companyProfileRepository.findByOrganizationId(organizationId);

    if (!companyProfile) {
      let companyName = "Company";
      if (this.organizationRepository) {
        try {
          const org =
            await this.organizationRepository.findById(organizationId);
          if (org?.name) {
            companyName = org.name;
          }
        } catch (orgErr) {
          console.warn(
            "[GET COMPANY PROFILE] Org fetch warning:",
            orgErr.message,
          );
        }
      }

      try {
        companyProfile = await this.companyProfileRepository.create({
          organizationId,
          companyName,
        });
      } catch (createErr) {
        console.error(
          "[GET COMPANY PROFILE] Auto-create profile error:",
          createErr.message,
        );
      }
    }

    if (!companyProfile) {
      throw new AppError(
        "Company profile not found.",
        404,
        "COMPANY_PROFILE_NOT_FOUND",
      );
    }

    return companyProfile;
  }
}
