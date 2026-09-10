export class OrganizationFeatureAccessController {
  constructor({
    getOrganizationFeatureAccessUseCase,
    updateOrganizationFeatureAccessUseCase,
  }) {
    this.getOrganizationFeatureAccessUseCase =
      getOrganizationFeatureAccessUseCase;

    this.updateOrganizationFeatureAccessUseCase =
      updateOrganizationFeatureAccessUseCase;
  }

  async get(req, res, next) {
    try {
      const { organizationId } = req.params;

      const result =
        await this.getOrganizationFeatureAccessUseCase.execute(organizationId);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { organizationId } = req.params;

      const result = await this.updateOrganizationFeatureAccessUseCase.execute({
        organizationId,
        ...req.body,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
