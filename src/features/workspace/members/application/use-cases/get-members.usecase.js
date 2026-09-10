import { AppError } from "../../../../../common/errors/AppError.js";

export class GetMembersUseCase {
  constructor({ workspaceMemberRepository }) {
    this.workspaceMemberRepository = workspaceMemberRepository;
  }

  async execute(organizationId) {
    const members =
      await this.workspaceMemberRepository.findAllByOrganizationId(
        organizationId,
      );

    if (!members || members.length === 0) {
      throw new AppError(
        "No workspace members found.",
        404,
        "WORKSPACE_MEMBERS_NOT_FOUND",
      );
    }

    return members;
  }
}
