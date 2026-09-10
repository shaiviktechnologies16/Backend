import { DEFAULT_FEATURE_FLAGS } from "../../domain/constants/default-feature-flags.js";

export class CreateWorkspaceSettingsUseCase {
  constructor({ workspaceSettingsRepository }) {
    this.workspaceSettingsRepository = workspaceSettingsRepository;
  }

  async execute(organizationId) {
    const settings = await this.workspaceSettingsRepository.create({
      organizationId,
      assistantName: "Zivra AI",
      assistantDescription: "AI Assistant",
      systemPrompt: "You are a helpful AI assistant",
      themeConfig: {},
      featureFlags: DEFAULT_FEATURE_FLAGS,
    });

    return settings;
  }
}
