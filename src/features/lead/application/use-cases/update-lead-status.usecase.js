import { AppError } from "../../../../common/errors/AppError.js";

const VALID_LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CONVERTED",
  "ARCHIVED",
];

export class UpdateLeadStatusUseCase {
  constructor({ leadRepository }) {
    this.leadRepository = leadRepository;
  }

  async execute({ organizationId, leadId, status }) {
    if (!leadId) {
      throw new AppError("Lead ID is required", 400);
    }

    if (!organizationId) {
      throw new AppError("Organization ID is required", 400);
    }

    const normalizedStatus = String(status || "")
      .trim()
      .toUpperCase();

    if (!normalizedStatus || !VALID_LEAD_STATUSES.includes(normalizedStatus)) {
      throw new AppError(
        `Invalid lead status '${status}'. Allowed statuses are: ${VALID_LEAD_STATUSES.join(", ")}`,
        400,
      );
    }

    const existingLead = await this.leadRepository.findById(leadId);

    if (!existingLead) {
      throw new AppError("Lead enquiry not found", 404);
    }

    if (existingLead.organizationId !== organizationId) {
      throw new AppError(
        "Lead enquiry does not belong to this organization",
        403,
      );
    }

    const updatedLead = await this.leadRepository.update(leadId, {
      status: normalizedStatus,
      updatedAt: new Date(),
    });

    return updatedLead;
  }
}
