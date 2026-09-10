export class GetWorkspaceApiKeysUseCase {
  constructor({ workspaceApiKeyRepository }) {
    this.workspaceApiKeyRepository = workspaceApiKeyRepository;
  }

  async execute(organizationId) {
    const apiKeys =
      await this.workspaceApiKeyRepository.findByOrganizationId(organizationId);

    return apiKeys.map((apiKey) => ({
      id: apiKey.id,
      organizationId: apiKey.organizationId,
      name: apiKey.name,
      description: apiKey.description,
      createdBy: apiKey.createdBy,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    }));
  }
}
