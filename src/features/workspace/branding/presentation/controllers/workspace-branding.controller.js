export class WorkspaceBrandingController {
  constructor({ getWorkspaceBrandingUseCase }) {
    this.getWorkspaceBrandingUseCase = getWorkspaceBrandingUseCase;
  }

  get = async (req, res, next) => {
    try {
      const branding = await this.getWorkspaceBrandingUseCase.execute(
        req.context.organization.id,
      );

      return res.json({
        success: true,
        data: branding,
      });
    } catch (error) {
      next(error);
    }
  };
}
