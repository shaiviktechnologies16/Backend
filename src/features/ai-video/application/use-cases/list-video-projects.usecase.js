import { AppError } from "../../../../common/errors/AppError.js";

export class ListVideoProjectsUseCase {
  constructor({ videoProjectRepository }) {
    this.videoProjectRepository = videoProjectRepository;
  }

  async execute({ organizationId, page = 1, limit = 20 }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { projects, total } = await this.videoProjectRepository.findAllByOrganization(
      organizationId,
      { limit: limitNum, offset }
    );

    return {
      projects,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }
}
