export class GetProjectKnowledgeSourcesUseCase {
  constructor({
    knowledgeSourceRepository,
    checkProjectAccessUseCase,
  }) {
    this.knowledgeSourceRepository = knowledgeSourceRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({ userId, projectId }) {
    await this.checkProjectAccessUseCase.execute({
      projectId,
      userId,
    });

    return this.knowledgeSourceRepository.findByProjectId(projectId);
  }
}
