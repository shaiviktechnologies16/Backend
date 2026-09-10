export class PlatformBrandingController {
  constructor({ updatePlatformBrandingUseCase }) {
    this.updatePlatformBrandingUseCase = updatePlatformBrandingUseCase;
  }

  async update(req, res, next) {
    try {
      const result = await this.updatePlatformBrandingUseCase.execute(req.body);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
