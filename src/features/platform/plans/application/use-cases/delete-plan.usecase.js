import { AppError } from "../../../../../common/errors/AppError.js";

export class DeletePlanUseCase {
  constructor(planRepository) {
    this.planRepository = planRepository;
  }

  async execute(id) {
    if (!id) {
      throw new AppError("Plan ID is required.", 400, "PLAN_ID_REQUIRED");
    }

    const plan = await this.planRepository.findById(id);

    if (!plan) {
      throw new AppError("Plan not found.", 404, "PLAN_NOT_FOUND");
    }

    const organizationCount = await this.planRepository.countOrganizations(id);

    if (organizationCount > 0) {
      throw new AppError(
        "Cannot delete a plan assigned to organizations.",
        409,
        "PLAN_ASSIGNED_TO_ORGANIZATIONS",
      );
    }

    await this.planRepository.delete(id);

    return {
      success: true,
    };
  }
}
