import { UpdateAISettingsDto } from "../../application/dto/update-ai-settings.dto.js";

export class AISettingsController {
  constructor({ getAISettingsUseCase, updateAISettingsUseCase }) {
    this.getAISettingsUseCase = getAISettingsUseCase;
    this.updateAISettingsUseCase = updateAISettingsUseCase;
  }

  get = async (req, res, next) => {
    try {
      const { organizationId } = req.params;

      const settings = await this.getAISettingsUseCase.execute(organizationId);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { organizationId } = req.params;

      const dto = new UpdateAISettingsDto(req.body);

      const settings = await this.updateAISettingsUseCase.execute(
        organizationId,
        dto,
      );

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  };
}
