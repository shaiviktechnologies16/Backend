export class OrganizationController {
  constructor({
    createOrganizationUseCase,
    getOrganizationsUseCase,
    getOrganizationUseCase,
    getOrganizationProjectsUseCase,
    updateOrganizationUseCase,
    deleteOrganizationUseCase,
    updateOrganizationLogoUseCase,
    uploadFileUseCase,
    getPublicOrganizationUseCase,
  }) {
    this.createOrganizationUseCase = createOrganizationUseCase;
    this.getOrganizationsUseCase = getOrganizationsUseCase;
    this.getOrganizationUseCase = getOrganizationUseCase;
    this.getOrganizationProjectsUseCase = getOrganizationProjectsUseCase;
    this.updateOrganizationUseCase = updateOrganizationUseCase;
    this.deleteOrganizationUseCase = deleteOrganizationUseCase;
    this.updateOrganizationLogoUseCase = updateOrganizationLogoUseCase;
    this.uploadFileUseCase = uploadFileUseCase;
    this.getPublicOrganizationUseCase = getPublicOrganizationUseCase;
  }

  getOrganizations = async (req, res, next) => {
    try {
      const organizations = await this.getOrganizationsUseCase.execute();

      return res.status(200).json({
        success: true,
        data: organizations,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrganizationById = async (req, res, next) => {
    try {
      const organization = await this.getOrganizationUseCase.execute(
        req.params.id,
      );

      return res.status(200).json({
        success: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  };

  getPublicOrganization = async (req, res, next) => {
    try {
      const organization = await this.getPublicOrganizationUseCase.execute(
        req.params.organizationId,
      );

      return res.status(200).json({
        success: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  };

  createOrganization = async (req, res, next) => {
    try {
      const organization = await this.createOrganizationUseCase.execute({
        name: req.body.name,
        ownerEmail: req.body.ownerEmail,
        logo: req.body.logo,
        website: req.body.website,
        description: req.body.description,
        permissions: req.body.permissions || [],
        ownerId: req.user.id,
        createdBy: req.user.id,
      });

      return res.status(201).json({
        success: true,
        message:
          "Organization created successfully. Invitation has been sent to the organization owner.",
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrganizationProjects = async (req, res, next) => {
    try {
      const projects = await this.getOrganizationProjectsUseCase.execute(
        req.params.id,
      );

      return res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (error) {
      next(error);
    }
  };

  updateOrganization = async (req, res, next) => {
    try {
      const organization = await this.updateOrganizationUseCase.execute(
        req.params.id,
        req.body,
      );

      return res.status(200).json({
        success: true,
        message: "Organization updated successfully.",
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  };

  updateLogo = async (req, res, next) => {
    try {
      const upload = await this.uploadFileUseCase.execute({
        userId: req.user.id,
        purpose: "ORGANIZATION_LOGO",
        organizationId: req.params.organizationId,
        file: req.file,
      });

      const organization = await this.updateOrganizationLogoUseCase.execute({
        organizationId: req.params.organizationId,
        logo: upload.storageUrl,
      });

      return res.json({
        success: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteOrganization = async (req, res, next) => {
    try {
      const result = await this.deleteOrganizationUseCase.execute(
        req.params.id,
      );

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };
}
