import { AppError } from "../../../../../common/errors/AppError.js";
import { OrganizationRole } from "../../../../organization/domain/constants/organization-role.js";
import { DEFAULT_FEATURE_FLAGS } from "../../domain/constants/default-feature-flags.js";

export class UpdateWorkspaceSettingsUseCase {
  constructor({ workspaceSettingsRepository }) {
    this.workspaceSettingsRepository = workspaceSettingsRepository;
  }

  async execute(organizationId, updateDto, requesterRole) {
    if (requesterRole !== OrganizationRole.OWNER) {
      throw new AppError(
        "Only owner can update workspace settings.",
        403,
        "WORKSPACE_SETTINGS_UPDATE_NOT_ALLOWED",
      );
    }

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

    return this.workspaceSettingsRepository.update(settings.id, {
      assistantName: updateDto.assistantName ?? settings.assistantName,
      assistantDescription:
        updateDto.assistantDescription ?? settings.assistantDescription,
      systemPrompt: updateDto.systemPrompt ?? settings.systemPrompt,
      themeConfig: updateDto.themeConfig ?? settings.themeConfig,
      featureFlags: updateDto.featureFlags ??
        settings.featureFlags ?? { ...DEFAULT_FEATURE_FLAGS },
      dailyBudgetUsd:
        updateDto.dailyBudgetUsd !== undefined
          ? updateDto.dailyBudgetUsd
          : settings.dailyBudgetUsd,
      monthlyBudgetUsd:
        updateDto.monthlyBudgetUsd !== undefined
          ? updateDto.monthlyBudgetUsd
          : settings.monthlyBudgetUsd,
    });
  }
}
