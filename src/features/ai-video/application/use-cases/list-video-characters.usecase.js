import { AppError } from "../../../../common/errors/AppError.js";

export class ListVideoCharactersUseCase {
  constructor({ videoCharacterRepository }) {
    this.videoCharacterRepository = videoCharacterRepository;
  }

  async execute({ organizationId, page = 1, limit = 50 }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const { characters, total } = await this.videoCharacterRepository.findAllByOrganization(
      organizationId,
      { limit: limitNum, offset }
    );

    return {
      characters,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }
}
