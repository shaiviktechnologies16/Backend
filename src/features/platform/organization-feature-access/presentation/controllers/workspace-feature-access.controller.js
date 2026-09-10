export class WorkspaceFeatureAccessController {
  constructor({ getOrganizationFeatureAccessUseCase }) {
    this.getOrganizationFeatureAccessUseCase =
      getOrganizationFeatureAccessUseCase;

    this.getFeatures = this.getFeatures.bind(this);
  }

  async getFeatures(req, res, next) {
    try {
      const organizationId = req.context.organization.id;

      const features =
        await this.getOrganizationFeatureAccessUseCase.execute(organizationId);

      return res.status(200).json({
        success: true,
        data: features,
      });
    } catch (error) {
      next(error);
    }
  }
}
