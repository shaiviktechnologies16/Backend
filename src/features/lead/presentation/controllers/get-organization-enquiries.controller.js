import { asyncHandler } from "../../../../common/utils/asyncHandler.js";

export const createGetOrganizationEnquiriesController = ({
  getOrganizationEnquiriesUseCase,
}) => {
  return {
    get: asyncHandler(async (req, res) => {
      const { organizationId } = req.params;

      const result = await getOrganizationEnquiriesUseCase.execute({
        organizationId,
        page: req.query.page,
        limit: req.query.limit,
        projectId: req.query.projectId ?? null,
        status: req.query.status ?? null,
        source: req.query.source ?? null,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    }),
  };
};
