export class PlatformConfigController {
  constructor(
    createPlatformConfigUseCase,
    getPlatformConfigUseCase,
    updatePlatformConfigUseCase,
  ) {
    this.createPlatformConfigUseCase = createPlatformConfigUseCase;
    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
    this.updatePlatformConfigUseCase = updatePlatformConfigUseCase;

    this.getAll = this.getAll.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
  }

  async getAll(req, res, next) {
    try {
      const result = await this.getPlatformConfigUseCase.execute();

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const result = await this.createPlatformConfigUseCase.execute(req.body);

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const result = await this.updatePlatformConfigUseCase.execute({
        configKey: req.params.configKey,
        ...req.body,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
