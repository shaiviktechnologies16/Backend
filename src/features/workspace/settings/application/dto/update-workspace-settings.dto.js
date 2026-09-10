export class UpdateWorkspaceSettingsDto {
  constructor({
    assistantName,
    assistantDescription,
    systemPrompt,
    themeConfig,
    featureFlags,
  }) {
    this.assistantName = assistantName;
    this.assistantDescription = assistantDescription;
    this.systemPrompt = systemPrompt;
    this.themeConfig = themeConfig;
    this.featureFlags = featureFlags;
  }
}
