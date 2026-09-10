export class OrganizationFeatureAccess {
  constructor({ id, organizationId, feature, enabled, createdAt, updatedAt }) {
    this.id = id;
    this.organizationId = organizationId;
    this.feature = feature;
    this.enabled = enabled;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
