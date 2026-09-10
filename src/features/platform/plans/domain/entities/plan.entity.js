export class Plan {
  constructor({
    id = null,
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
    features = [],
    usageLimit = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.name = name;
    this.code = code;
    this.slug = slug || code?.toLowerCase();
    this.description = description;
    this.priceMonthly = Number(priceMonthly ?? 0);
    this.priceYearly = Number(priceYearly ?? 0);
    this.currency = currency || "USD";
    this.displayOrder = Number(displayOrder ?? 0);
    this.isActive = Boolean(isActive);
    this.isPublic = Boolean(isPublic);
    this.isDefault = Boolean(isDefault);
    this.isArchived = Boolean(isArchived);
    this.trialEnabled = Boolean(trialEnabled);
    this.trialDays = Number(trialDays ?? 0);
    this.features = features;
    this.usageLimit = usageLimit;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
