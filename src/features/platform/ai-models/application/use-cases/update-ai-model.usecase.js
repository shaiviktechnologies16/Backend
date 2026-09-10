export class UpdateAIModelUseCase {
  constructor({ aiModelRepository }) {
    this.aiModelRepository = aiModelRepository;
  }

  async execute(id, data) {
    return await this.aiModelRepository.update(id, data);
  }
}
