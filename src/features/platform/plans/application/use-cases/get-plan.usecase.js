export class GetPlanUseCase {
  constructor(planRepository) {
    this.planRepository = planRepository;
  }

  async execute(id) {
    if (!id) {
      throw new Error("Plan ID is required.");
    }

    const plan = await this.planRepository.findById(id);

    if (!plan) {
      throw new Error("Plan not found.");
    }

    const usageLimit = await this.planRepository.findUsageLimit(id);

    return {
      ...plan,
      usageLimit,
    };
  }
}
