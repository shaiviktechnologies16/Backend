import { AppError } from "../../../../common/errors/AppError.js";

export class GetVideoCharacterUseCase {
  constructor({ videoCharacterRepository }) {
    this.videoCharacterRepository = videoCharacterRepository;
  }

  async execute({ organizationId, characterId }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    if (!characterId) {
      throw new AppError("Character ID is required", 400, "MISSING_CHARACTER_ID");
    }

    const character = await this.videoCharacterRepository.findByIdForOrganization(
      characterId,
      organizationId
    );

    if (!character) {
      throw new AppError("Video character not found", 404, "CHARACTER_NOT_FOUND");
    }

    return character;
  }
}
