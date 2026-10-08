import { AppError } from "../../../../common/errors/AppError.js";

export class CreateVideoCharacterUseCase {
  constructor({ videoCharacterRepository }) {
    this.videoCharacterRepository = videoCharacterRepository;
  }

  async execute({
    organizationId,
    createdById,
    name,
    description = null,
    referenceImageUrl = null,
    uploadedImageUrl = null,
    style = "cartoon",
    metadata = null,
  }) {
    if (!organizationId) {
      throw new AppError("Organization ID is required", 400, "MISSING_ORGANIZATION_ID");
    }

    if (!createdById) {
      throw new AppError("Created by User ID is required", 400, "MISSING_USER_ID");
    }

    if (!name || !name.trim()) {
      throw new AppError("Character name is required", 400, "INVALID_CHARACTER_NAME");
    }

    const finalReferenceImageUrl =
      uploadedImageUrl && uploadedImageUrl.trim()
        ? uploadedImageUrl.trim()
        : referenceImageUrl && referenceImageUrl.trim()
          ? referenceImageUrl.trim()
          : null;

    const characterData = {
      organizationId,
      createdById,
      name: name.trim(),
      description: description ? description.trim() : null,
      referenceImageUrl: finalReferenceImageUrl,
      style: style ? style.trim() : "cartoon",
      metadata: {
        ...(metadata || {}),
        referenceImageSource:
          uploadedImageUrl && uploadedImageUrl.trim()
            ? "upload"
            : referenceImageUrl && referenceImageUrl.trim()
              ? "url"
              : null,
      },
    };

    const character = await this.videoCharacterRepository.create(characterData);
    return character;
  }
}
