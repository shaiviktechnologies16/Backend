import { asyncHandler } from "../../../../common/utils/asyncHandler.js";

export const createUpdateLeadStatusController = ({
  updateLeadStatusUseCase,
}) => {
  return {
    updateStatus: asyncHandler(async (req, res) => {
      const { organizationId, leadId } = req.params;
      const { status } = req.body;

      const updatedLead = await updateLeadStatusUseCase.execute({
        organizationId,
        leadId,
        status,
      });

      res.status(200).json({
        success: true,
        message: "Lead status updated successfully",
        data: updatedLead,
      });
    }),
  };
};
