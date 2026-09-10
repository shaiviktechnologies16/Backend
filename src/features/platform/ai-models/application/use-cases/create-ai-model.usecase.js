export class CreateAIModelUseCase {
  constructor({ aiModelRepository }) {
    this.aiModelRepository = aiModelRepository;
  }

  async execute(data) {
    return await this.aiModelRepository.create(data);
  }
}
