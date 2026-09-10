import { AISettings } from "../../domain/entities/ai-settings.entity.js";

export class UpdateAISettingsUseCase {
  constructor({ aiSettingsRepository }) {
    this.aiSettingsRepository = aiSettingsRepository;
  }

  async execute(organizationId, data) {
    let settings =
      await this.aiSettingsRepository.findByOrganizationId(organizationId);

    if (!settings) {
      settings = new AISettings({
        organizationId,
        ...data,
      });
      return await this.aiSettingsRepository.create(settings);
    }

    settings.update(data);
    return await this.aiSettingsRepository.update(settings);
  }
}
