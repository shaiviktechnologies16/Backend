import { AppError } from "../../../../../common/errors/AppError.js";

export class GetWorkspaceSettingsUseCase {
  constructor({ workspaceSettingsRepository }) {
    this.workspaceSettingsRepository = workspaceSettingsRepository;
  }

  async execute(organizationId) {
    const settings =
      await this.workspaceSettingsRepository.findByOrganizationId(
        organizationId,
      );

    if (!settings) {
      throw new AppError(
        "Workspace settings not found.",
        404,
        "WORKSPACE_SETTINGS_NOT_FOUND",
      );
    }

    return settings;
  }
}
