export class RemoveModelAccessUseCase {
  constructor({ organizationModelAccessRepository }) {
    this.organizationModelAccessRepository = organizationModelAccessRepository;
  }

  async execute({ organizationId, aiModelId }) {
    return this.organizationModelAccessRepository.delete(
      organizationId,
      aiModelId,
    );
  }
}
