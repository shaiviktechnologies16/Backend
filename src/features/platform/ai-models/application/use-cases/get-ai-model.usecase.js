export class GetAIModelUseCase {
  constructor({ aiModelRepository }) {
    this.aiModelRepository = aiModelRepository;
  }

  async execute(id) {
    return await this.aiModelRepository.findById(id);
  }
}
