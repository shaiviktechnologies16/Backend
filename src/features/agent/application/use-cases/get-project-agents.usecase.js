import { AppError } from "../../../../common/errors/AppError.js";

export class GetProjectAgentsUseCase {
  constructor({ agentRepository, checkProjectAccessUseCase }) {
    this.agentRepository = agentRepository;
    this.checkProjectAccessUseCase = checkProjectAccessUseCase;
  }

  async execute({ userId, projectId }) {
    await this.checkProjectAccessUseCase.execute({
      projectId,
      userId,
    });

    const agents = await this.agentRepository.findByProjectId(projectId);

    return agents;
  }
}
