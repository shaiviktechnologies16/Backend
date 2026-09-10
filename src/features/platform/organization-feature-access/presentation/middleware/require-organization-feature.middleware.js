import { AppError } from "../../../../../common/errors/AppError.js";

export const requireOrganizationFeature = ({
  organizationFeatureAccessRepository,
  feature,
}) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.context?.organization?.id;

      if (!organizationId) {
        throw new AppError(
          "Organization context is required.",
          400,
          "ORGANIZATION_CONTEXT_REQUIRED",
        );
      }

      const enabled = await organizationFeatureAccessRepository.isEnabled(
        organizationId,
        feature,
      );

      if (!enabled) {
        throw new AppError(
          `${feature} feature is not enabled for this organization.`,
          403,
          "ORGANIZATION_FEATURE_NOT_ENABLED",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
