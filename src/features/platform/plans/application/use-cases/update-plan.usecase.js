export class UpdatePlanUseCase {
  constructor(planRepository) {
    this.planRepository = planRepository;
  }

  async execute(id, payload) {
    if (!id) {
      throw new Error("Plan ID is required.");
    }

    const existing = await this.planRepository.findById(id);

    if (!existing) {
      throw new Error("Plan not found.");
    }

    const data = {};

    if (payload.name !== undefined) {
      if (!payload.name.trim()) {
        throw new Error("Plan name cannot be empty.");
      }
      data.name = payload.name.trim();
    }

    if (payload.code !== undefined) {
      if (!payload.code.trim()) {
        throw new Error("Plan code cannot be empty.");
      }

      const normalizedCode = payload.code.trim().toUpperCase();

      if (normalizedCode !== existing.code) {
        const codeExists = await this.planRepository.findByCode(normalizedCode);

        if (codeExists && codeExists.id !== id) {
          throw new Error("Plan code already exists.");
        }
      }

      data.code = normalizedCode;
    }

    if (payload.slug !== undefined)
      data.slug = payload.slug.trim().toLowerCase();
    if (payload.description !== undefined)
      data.description = payload.description;
    if (payload.priceMonthly !== undefined)
      data.priceMonthly = Number(payload.priceMonthly ?? 0);
    if (payload.priceYearly !== undefined)
      data.priceYearly = Number(payload.priceYearly ?? 0);
    if (payload.currency !== undefined) data.currency = payload.currency;
    if (payload.displayOrder !== undefined)
      data.displayOrder = Number(payload.displayOrder ?? 0);
    if (payload.isActive !== undefined)
      data.isActive = Boolean(payload.isActive);
    if (payload.isPublic !== undefined)
      data.isPublic = Boolean(payload.isPublic);
    if (payload.isDefault !== undefined)
      data.isDefault = Boolean(payload.isDefault);
    if (payload.isArchived !== undefined)
      data.isArchived = Boolean(payload.isArchived);
    if (payload.trialEnabled !== undefined)
      data.trialEnabled = Boolean(payload.trialEnabled);
    if (payload.trialDays !== undefined)
      data.trialDays = Number(payload.trialDays ?? 0);

    return this.planRepository.update(id, data);
  }
}
