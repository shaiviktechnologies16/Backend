import { asyncHandler } from "../../../../../common/utils/asyncHandler.js";
import { UpdateCompanyProfileDto } from "../../application/dto/update-company-profile.dto.js";

export class CompanyProfileController {
  constructor({ getCompanyProfileUseCase, updateCompanyProfileUseCase }) {
    this.getCompanyProfileUseCase = getCompanyProfileUseCase;

    this.updateCompanyProfileUseCase = updateCompanyProfileUseCase;
  }

  get = asyncHandler(async (req, res) => {
    const organizationId =
      req.context?.organization?.id ||
      req.headers["x-organization-id"] ||
      req.query?.organizationId;

    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    const result = await this.getCompanyProfileUseCase.execute(organizationId);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  update = asyncHandler(async (req, res) => {
    const organizationId =
      req.context?.organization?.id ||
      req.headers["x-organization-id"] ||
      req.query?.organizationId;

    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    const requesterRole = req.context?.membership?.role || "OWNER";

    const updateDto = new UpdateCompanyProfileDto(req.body);

    const result = await this.updateCompanyProfileUseCase.execute(
      organizationId,
      updateDto,
      requesterRole,
    );

    res.status(200).json({
      success: true,
      message: "Company profile updated successfully.",
      data: result,
    });
  });
}
