export class GetAISettingsUseCase {
  constructor({ aiSettingsRepository }) {
    this.aiSettingsRepository = aiSettingsRepository;
  }

  async execute(organizationId) {
    let settings =
      await this.aiSettingsRepository.findByOrganizationId(organizationId);

    if (!settings) {
      settings = {
        organizationId,
        defaultInstructions: "",
        conversationRules: "",
        tone: "professional",
        responseStyle: "balanced",
      };
    }

    return settings;
  }
}
