import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { ValidationError } from "../../../../common/errors/ValidationError.js";

export const createPublicEnquiryController = ({
  createPublicEnquiryUseCase,
}) => {
  return {
    create: asyncHandler(async (req, res) => {
      const { projectId, name, phone, email, company, requirement, metadata } =
        req.body;

      if (!projectId) {
        throw new ValidationError("Project ID is required.");
      }

      if (!name) {
        throw new ValidationError("Name is required.");
      }

      if (!phone) {
        throw new ValidationError("Phone number is required.");
      }

      const result = await createPublicEnquiryUseCase.execute({
        projectId,
        name,
        phone,
        email: email ?? null,
        company: company ?? null,
        requirement: requirement ?? null,
        metadata: metadata ?? {},
      });

      res.status(201).json({
        success: true,
        data: {
          lead: result.lead,
          whatsapp: result.whatsapp,
        },
      });
    }),
  };
};
