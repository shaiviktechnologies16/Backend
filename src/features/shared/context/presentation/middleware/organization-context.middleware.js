import { OrganizationContextEntity } from "../../domain/entities/organization-context.entity.js";

export function organizationContextMiddleware({
  resolveOrganizationContextUseCase,
}) {
  return async (req, res, next) => {
    try {
      const organizationId =
        req.headers["x-organization-id"] || req.params.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization context required.",
        });
      }

      const organization = await resolveOrganizationContextUseCase.execute(
        req.user.id,
        organizationId,
      );

      req.context = req.context || {};

      req.context.organization = new OrganizationContextEntity({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: organization.role,
        status: organization.status,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}
