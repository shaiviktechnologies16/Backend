import { AppError } from "../../../../../common/errors/AppError.js";
import { WorkspaceApiKey } from "../../domain/entities/workspace-api-key.entity.js";

export class CreateWorkspaceApiKeyUseCase {
  constructor({ workspaceApiKeyRepository, encryptionService }) {
    this.workspaceApiKeyRepository = workspaceApiKeyRepository;
    this.encryptionService = encryptionService;
  }

  async execute({ organizationId, userId, role, name, description, value }) {
    if (!["OWNER", "ADMIN"].includes(role)) {
      throw new AppError(
        "You do not have permission to manage workspace API keys.",
        403,
        "API_KEY_MANAGEMENT_FORBIDDEN",
      );
    }

    const existingKeys =
      await this.workspaceApiKeyRepository.findByOrganizationId(organizationId);

    const existing = existingKeys.find((apiKey) => apiKey.name === name);

    if (existing) {
      throw new AppError(
        "An API key with this name already exists.",
        409,
        "API_KEY_ALREADY_EXISTS",
      );
    }

    const encryptedValue = this.encryptionService.encrypt(value);

    const apiKey = new WorkspaceApiKey({
      organizationId,
      name,
      description,
      encryptedValue,
      createdBy: userId,
    });

    const created = await this.workspaceApiKeyRepository.create(apiKey);

    return {
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      description: created.description,
      createdBy: created.createdBy,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }
}
