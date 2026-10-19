import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { ValidationError } from "../../../../common/errors/ValidationError.js";
import { ProjectResponse } from "../../../project/application/dto/responses/project.response.js";

export const createPublicProjectRequestController = ({
  submitProjectRequestUseCase,
}) => {
  return {
    submit: asyncHandler(async (req, res) => {
      const {
        fullName,
        mobile,
        email,
        company,
        projectType,
        requirements,
        organizationId,
      } = req.body;

      if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
        throw new ValidationError("Full name is required.");
      }

      if (!mobile || typeof mobile !== "string" || !mobile.trim()) {
        throw new ValidationError("Mobile number is required.");
      }

      if (
        !requirements ||
        typeof requirements !== "string" ||
        !requirements.trim()
      ) {
        throw new ValidationError("Project requirements are required.");
      }

      const result = await submitProjectRequestUseCase.execute({
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        email: email ? String(email).trim() : null,
        company: company ? String(company).trim() : null,
        projectType: projectType ? String(projectType).trim() : null,
        requirements: requirements.trim(),
        organizationId: organizationId || null,
      });

      res.status(201).json({
        success: true,
        message: "Project request submitted successfully.",
        data: {
          project: ProjectResponse.fromEntity(result.project),
          lead: result.lead
            ? {
                id: result.lead.id,
                status: result.lead.status,
                createdAt: result.lead.createdAt,
              }
            : null,
          whatsapp: result.whatsapp,
        },
      });
    }),
  };
};

