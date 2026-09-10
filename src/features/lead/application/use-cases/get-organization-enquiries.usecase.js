import { AppError } from "../../../../common/errors/AppError.js";

export class GetOrganizationEnquiriesUseCase {
  constructor({ leadRepository }) {
    this.leadRepository = leadRepository;
  }

  async execute({
    organizationId,
    page = 1,
    limit = 20,
    projectId = null,
    status = null,
    source = null,
  }) {
    if (!organizationId) {
      throw new AppError(
        "Organization ID is required.",
        400,
        "ORGANIZATION_ID_REQUIRED",
      );
    }

    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    return this.leadRepository.findByOrganizationId(organizationId, {
      page: normalizedPage,
      limit: normalizedLimit,
      projectId,
      status,
      source,
    });
  }
}
