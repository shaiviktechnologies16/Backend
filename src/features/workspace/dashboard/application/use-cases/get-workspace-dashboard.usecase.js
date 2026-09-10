import { AppError } from "../../../../../common/errors/AppError.js";

export class GetWorkspaceDashboardUseCase {
  constructor({ workspaceDashboardRepository, organizationRepository }) {
    this.workspaceDashboardRepository = workspaceDashboardRepository;
    this.organizationRepository = organizationRepository;
  }

  async execute({ organizationId }) {
    if (!organizationId) {
      throw new AppError(
        "Organization id is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new AppError(
        "Organization not found.",
        404,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    return this.workspaceDashboardRepository.getDashboardSummary(
      organizationId,
    );
  }
}
