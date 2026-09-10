export class PlanFeature {
  constructor({
    id = null,
    planId,
    featureKey,
    isEnabled = true,
    config = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.planId = planId;
    this.featureKey = featureKey;
    this.isEnabled = Boolean(isEnabled);
    this.config = config;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
