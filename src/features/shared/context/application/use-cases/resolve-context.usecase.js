import { RequestContextEntity } from "../../domain/entities/request-context.entity.js";

export class ResolveContextUseCase {
  constructor({
    resolveOrganizationContextUseCase,
    resolveProjectContextUseCase,
    resolveAgentContextUseCase,
    organizationMemberRepository,
  }) {
    this.resolveOrganizationContextUseCase = resolveOrganizationContextUseCase;

    this.resolveProjectContextUseCase = resolveProjectContextUseCase;

    this.resolveAgentContextUseCase = resolveAgentContextUseCase;

    this.organizationMemberRepository = organizationMemberRepository;
  }

  async execute({
    user,
    organizationId = null,
    projectId = null,
    agentId = null,
  }) {
    let organization = null;
    let membership = null;

    if (organizationId) {
      organization = await this.resolveOrganizationContextUseCase.execute(
        user,
        organizationId,
      );

      membership =
        await this.organizationMemberRepository.findByOrganizationAndUser(
          organizationId,
          user.id,
        );
    } else {
      membership = await this.organizationMemberRepository.findByUserId(
        user.id,
      );

      if (membership) {
        organization = await this.resolveOrganizationContextUseCase.execute(
          user,
          membership.organizationId,
        );
      }
    }

    const project = projectId
      ? await this.resolveProjectContextUseCase.execute(
          user.id,
          projectId,
          organization?.id,
        )
      : null;

    const agent = agentId
      ? await this.resolveAgentContextUseCase.execute(
          user.id,
          agentId,
          organization?.id,
          project?.id,
        )
      : null;

    return new RequestContextEntity({
      user,
      organization,
      membership,
      project,
      agent,
    });
  }
}
