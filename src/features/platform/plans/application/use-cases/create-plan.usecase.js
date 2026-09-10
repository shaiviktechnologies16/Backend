export class CreatePlanUseCase {
  constructor(planRepository) {
    this.planRepository = planRepository;
  }

  async execute({
    name,
    code,
    slug = null,
    description = null,
    priceMonthly = 0,
    priceYearly = 0,
    currency = "USD",
    displayOrder = 0,
    isActive = true,
    isPublic = true,
    isDefault = false,
    isArchived = false,
    trialEnabled = false,
    trialDays = 0,
  }) {
    if (!name || !name.trim()) {
      throw new Error("Plan name is required.");
    }

    if (!code || !code.trim()) {
      throw new Error("Plan code is required.");
    }

    const normalizedCode = code.trim().toUpperCase();
    const normalizedSlug = (slug || name)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    const existing = await this.planRepository.findByCode(normalizedCode);

    if (existing) {
      throw new Error("Plan code already exists.");
    }

    return this.planRepository.create({
      name: name.trim(),
      code: normalizedCode,
      slug: normalizedSlug,
      description,
      priceMonthly: Number(priceMonthly ?? 0),
      priceYearly: Number(priceYearly ?? 0),
      currency: currency || "USD",
      displayOrder: Number(displayOrder ?? 0),
      isActive: Boolean(isActive),
      isPublic: Boolean(isPublic),
      isDefault: Boolean(isDefault),
      isArchived: Boolean(isArchived),
      trialEnabled: Boolean(trialEnabled),
      trialDays: Number(trialDays ?? 0),
    });
  }
}
