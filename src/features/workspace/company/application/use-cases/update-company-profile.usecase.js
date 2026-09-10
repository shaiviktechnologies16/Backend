import { AppError } from "../../../../../common/errors/AppError.js";
import { OrganizationRole } from "../../../../organization/domain/constants/organization-role.js";

export class UpdateCompanyProfileUseCase {
  constructor({ companyProfileRepository }) {
    this.companyProfileRepository = companyProfileRepository;
  }

  async execute(organizationId, updateDto, requesterRole) {
    if (requesterRole !== OrganizationRole.OWNER) {
      throw new AppError(
        "Only owner can update company profile.",
        403,
        "COMPANY_PROFILE_UPDATE_NOT_ALLOWED",
      );
    }

    const companyProfile =
      await this.companyProfileRepository.findByOrganizationId(organizationId);

    if (!companyProfile) {
      throw new AppError(
        "Company profile not found.",
        404,
        "COMPANY_PROFILE_NOT_FOUND",
      );
    }

    const updateData = updateDto.toUpdateObject();

    if (!Object.keys(updateData).length) {
      throw new AppError(
        "At least one profile field is required.",
        400,
        "COMPANY_PROFILE_UPDATE_EMPTY",
      );
    }

    return this.companyProfileRepository.update(companyProfile.id, updateData);
  }
}
