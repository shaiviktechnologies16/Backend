export class GetPlatformApiKeysUseCase {
  constructor({ platformApiKeyRepository }) {
    this.platformApiKeyRepository = platformApiKeyRepository;
  }

  async execute() {
    const apiKeys = await this.platformApiKeyRepository.findAll();

    return apiKeys.map((apiKey) => ({
      id: apiKey.id,
      provider: apiKey.provider,
      name: apiKey.name,
      description: apiKey.description,
      isActive: apiKey.isActive,
      createdBy: apiKey.createdBy,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    }));
  }
}
