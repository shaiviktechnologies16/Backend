export class GetPlansUseCase {
  constructor(planRepository) {
    this.planRepository = planRepository;
  }

  async execute() {
    const plans = await this.planRepository.findAll();

    return Promise.all(
      plans.map(async (plan) => ({
        ...plan,
        usageLimit: await this.planRepository.findUsageLimit(plan.id),
      })),
    );
  }
}
