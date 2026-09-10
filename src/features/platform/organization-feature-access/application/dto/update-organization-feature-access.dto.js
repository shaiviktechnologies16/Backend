export class UpdateOrganizationFeatureAccessDto {
  constructor({ feature, enabled }) {
    this.feature = feature;
    this.enabled = enabled;
  }
}
