import { AppError } from "../../../../../common/errors/AppError.js";

export class DeletePlatformApiKeyUseCase {
  constructor({ platformApiKeyRepository }) {
    this.platformApiKeyRepository = platformApiKeyRepository;
  }

  async execute(id) {
    const existing = await this.platformApiKeyRepository.findById(id);

    if (!existing) {
      throw new AppError(
        "Platform API key not found.",
        404,
        "PLATFORM_API_KEY_NOT_FOUND",
      );
    }

    await this.platformApiKeyRepository.delete(id);

    return {
      id,
      deleted: true,
    };
  }
}
