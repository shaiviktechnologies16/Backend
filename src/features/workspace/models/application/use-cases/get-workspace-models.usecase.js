export class GetWorkspaceModelsUseCase {
  constructor({ workspaceModelRepository }) {
    this.workspaceModelRepository = workspaceModelRepository;
  }

  async execute(organizationId) {
    return this.workspaceModelRepository.findAvailableModels(organizationId);
  }
}
