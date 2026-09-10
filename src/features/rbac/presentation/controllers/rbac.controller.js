export class RbacController {
  constructor(getAllPermissionsUseCase) {
    this.getAllPermissionsUseCase = getAllPermissionsUseCase;

    this.getAllPermissions = this.getAllPermissions.bind(this);
  }

  async getAllPermissions(req, res, next) {
    try {
      const permissions = await this.getAllPermissionsUseCase.execute();

      return res.status(200).json({
        message: "Permissions fetched successfully.",
        data: permissions,
      });
    } catch (error) {
      next(error);
    }
  }
}
