export class AddModelAccessUseCase {
  constructor({ organizationModelAccessRepository }) {
    this.organizationModelAccessRepository = organizationModelAccessRepository;
  }

  async execute({ organizationId, aiModelId }) {
    const existing = await this.organizationModelAccessRepository.findOne(
      organizationId,
      aiModelId,
    );

    if (existing) {
      return existing;
    }

    return this.organizationModelAccessRepository.create({
      organizationId,
      aiModelId,
    });
  }
}
