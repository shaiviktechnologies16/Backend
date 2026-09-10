export class UpdateAIModelStatusUseCase {
  constructor({ aiModelRepository }) {
    this.aiModelRepository = aiModelRepository;
  }

  async execute(id, status) {
    return await this.aiModelRepository.updateStatus(id, status);
  }
}
