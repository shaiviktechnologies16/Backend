export class WorkspaceSettingsEntity {
  constructor({
    id,
    organizationId,
    assistantName,
    assistantDescription,
    systemPrompt,
    themeConfig,
    featureFlags,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.assistantName = assistantName;
    this.assistantDescription = assistantDescription;
    this.systemPrompt = systemPrompt;
    this.themeConfig = themeConfig;
    this.featureFlags = featureFlags;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    Object.freeze(this);
  }
}
