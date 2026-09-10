export class GetAIModelsUseCase {
  constructor({ aiModelRepository }) {
    this.aiModelRepository = aiModelRepository;
  }

  async execute() {
    return await this.aiModelRepository.findAll();
  }
}
