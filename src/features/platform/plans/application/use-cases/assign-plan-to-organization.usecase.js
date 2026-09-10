export class AssignPlanToOrganizationUseCase {
  constructor(planRepository) {
    this.planRepository = planRepository;
  }

  async execute(organizationId, planId) {
    return this.planRepository.assignToOrganization(organizationId, planId);
  }
}
