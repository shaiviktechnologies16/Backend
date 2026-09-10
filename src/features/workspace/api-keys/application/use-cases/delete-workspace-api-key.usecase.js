import { AppError } from "../../../../../common/errors/AppError.js";

export class DeleteWorkspaceApiKeyUseCase {
  constructor({ workspaceApiKeyRepository }) {
    this.workspaceApiKeyRepository = workspaceApiKeyRepository;
  }

  async execute({ organizationId, role, apiKeyId }) {
    if (!["OWNER", "ADMIN"].includes(role)) {
      throw new AppError(
        "You do not have permission to manage workspace API keys.",
        403,
        "API_KEY_MANAGEMENT_FORBIDDEN",
      );
    }

    const apiKey = await this.workspaceApiKeyRepository.findById(apiKeyId);

    if (!apiKey) {
      throw new AppError(
        "Workspace API key not found.",
        404,
        "API_KEY_NOT_FOUND",
      );
    }

    if (apiKey.organizationId !== organizationId) {
      throw new AppError(
        "Workspace API key not found.",
        404,
        "API_KEY_NOT_FOUND",
      );
    }

    await this.workspaceApiKeyRepository.delete(apiKeyId);
  }
}
