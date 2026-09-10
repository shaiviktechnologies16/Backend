export class GetProjectMembersUseCase {
  constructor(projectMemberRepository, checkProjectAccessUseCase) {
    this.projectMemberRepository = projectMemberRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({ projectId, requesterId }) {
    await this.checkProjectAccessUseCase.execute({
      projectId,
      userId: requesterId,
    });

    return await this.projectMemberRepository.findAllByProject(projectId);
  }
}
