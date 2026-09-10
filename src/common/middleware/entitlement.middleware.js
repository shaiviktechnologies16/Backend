import { AppError } from "../errors/AppError.js";

export function createEntitlementMiddleware(entitlementService) {
  const resolveOrganizationId = (req) => {
    return (
      req.params?.organizationId ||
      req.body?.organizationId ||
      req.query?.organizationId ||
      req.headers?.["x-organization-id"] ||
      req.context?.organizationId ||
      req.context?.organization?.id ||
      req.context?.membership?.organizationId ||
      req.user?.organizationId ||
      null
    );
  };

  const requireFeature = (featureKey) => {
    return async (req, res, next) => {
      try {
        const organizationId = resolveOrganizationId(req);

        if (!organizationId) {
          return next();
        }

        const result = await entitlementService.canUseFeature(
          organizationId,
          featureKey,
        );

        if (!result.allowed) {
          return next(
            new AppError(
              result.reason ||
                `Feature ${featureKey} is disabled for your plan.`,
              403,
              "FEATURE_NOT_INCLUDED",
              {
                feature: featureKey,
                requiredPlan: result.requiredPlan,
              },
            ),
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  const enforceResourceLimit = (resourceKey) => {
    return async (req, res, next) => {
      try {
        const organizationId = resolveOrganizationId(req);

        if (!organizationId) {
          return next();
        }

        await entitlementService.canCreateResource(organizationId, resourceKey);

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  return {
    requireFeature,
    enforceResourceLimit,
  };
}
