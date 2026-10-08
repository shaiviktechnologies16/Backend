import { OrganizationContextEntity } from "../../domain/entities/organization-context.entity.js";
import { ContextErrors } from "../../domain/constants/context-errors.js";
import { AppError } from "../../../../../common/errors/AppError.js";

export class ResolveOrganizationContextUseCase {
  constructor({ organizationMemberRepository, organizationRepository }) {
    this.organizationMemberRepository = organizationMemberRepository;

    this.organizationRepository = organizationRepository;
  }

  async execute(userOrUserId, organizationId) {
    const userId = typeof userOrUserId === "object" ? userOrUserId?.id : userOrUserId;
    const platformRole = typeof userOrUserId === "object" ? userOrUserId?.platformRole : null;

    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new AppError(
        "Organization not found.",
        404,
        ContextErrors.ORGANIZATION_CONTEXT_NOT_FOUND,
      );
    }

    if (
      platformRole === "PLATFORM_ADMIN" ||
      platformRole === "PLATFORM_MANAGER"
    ) {
      return new OrganizationContextEntity({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: "PLATFORM",
        status: organization.status,
      });
    }

    const membership =
      await this.organizationMemberRepository.findByOrganizationAndUser(
        organizationId,
        userId,
      );

    if (!membership) {
      throw new AppError(
        "Organization access denied.",
        403,
        ContextErrors.ORGANIZATION_CONTEXT_NOT_FOUND,
      );
    }

    return new OrganizationContextEntity({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: membership.role,
      status: organization.status,
    });
  }
}
