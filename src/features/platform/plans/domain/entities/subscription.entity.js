export class Subscription {
  constructor({
    id = null,
    organizationId,
    planId = null,
    status = "ACTIVE",
    billingInterval = "MONTHLY",
    currentPeriodStart = null,
    currentPeriodEnd = null,
    trialEndsAt = null,
    canceledAt = null,
    plan = null,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.planId = planId;
    this.status = status; // ACTIVE | TRIALING | PAST_DUE | CANCELED | EXPIRED | SUSPENDED
    this.billingInterval = billingInterval; // MONTHLY | YEARLY
    this.currentPeriodStart = currentPeriodStart;
    this.currentPeriodEnd = currentPeriodEnd;
    this.trialEndsAt = trialEndsAt;
    this.canceledAt = canceledAt;
    this.plan = plan;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
