export class OrganizationInvitationController {
  constructor(
    createOrganizationInvitationUseCase,
    validateOrganizationInvitationUseCase,
    acceptOrganizationInvitationUseCase,
  ) {
    this.createOrganizationInvitationUseCase =
      createOrganizationInvitationUseCase;

    this.validateOrganizationInvitationUseCase =
      validateOrganizationInvitationUseCase;

    this.acceptOrganizationInvitationUseCase =
      acceptOrganizationInvitationUseCase;
  }

  createInvitation = async (req, res, next) => {
    try {
      const invitation = await this.createOrganizationInvitationUseCase.execute(
        {
          organizationId: req.body.organizationId,
          email: req.body.email,
          role: req.body.role,
          permissionIds: req.body.permissionIds || [],
          createdBy: req.user.id,
        },
      );

      return res.status(201).json({
        success: true,
        message: "Organization invitation created successfully.",
        data: invitation,
      });
    } catch (error) {
      next(error);
    }
  };

  validateInvitation = async (req, res, next) => {
    try {
      const invitation =
        await this.validateOrganizationInvitationUseCase.execute(
          req.params.token,
        );

      return res.status(200).json({
        success: true,
        data: invitation,
      });
    } catch (error) {
      next(error);
    }
  };

  acceptInvitation = async (req, res, next) => {
    try {
      const { name, password } = req.body || {};

      const userId = req.user?.id;

      const result = await this.acceptOrganizationInvitationUseCase.execute({
        token: req.params.token,
        name,
        password,
        userId,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
