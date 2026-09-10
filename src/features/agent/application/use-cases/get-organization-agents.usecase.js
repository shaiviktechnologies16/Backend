import { AppError } from "../../../../common/errors/AppError.js";

export class GetOrganizationAgentsUseCase {
  constructor({ agentRepository, organizationMemberRepository }) {
    this.agentRepository = agentRepository;
    this.organizationMemberRepository = organizationMemberRepository;
  }

  async execute({ userId, organizationId }) {
    const membership =
      await this.organizationMemberRepository.findByOrganizationAndUser(
        organizationId,
        userId,
      );

    if (!membership) {
      throw new AppError(
        "Organization access denied.",
        403,
        "ORGANIZATION_ACCESS_DENIED",
      );
    }

    return this.agentRepository.findByOrganizationId(organizationId);
  }
}
