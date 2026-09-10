export class AdminController {
  constructor(
    getDashboardStatsUseCase,
    getUsersUseCase,
    getAdminsUseCase,
    getUserByIdUseCase,
    updateUserRoleUseCase,
    deleteUserUseCase,
    createAdminUseCase,
    updateAdminStatusUseCase,
    deleteAdminUseCase,
    updateAdminPermissionsUseCase,
  ) {
    this.getDashboardStatsUseCase = getDashboardStatsUseCase;
    this.getUsersUseCase = getUsersUseCase;
    this.getAdminsUseCase = getAdminsUseCase;
    this.getUserByIdUseCase = getUserByIdUseCase;
    this.updateUserRoleUseCase = updateUserRoleUseCase;
    this.deleteUserUseCase = deleteUserUseCase;
    this.createAdminUseCase = createAdminUseCase;
    this.updateAdminStatusUseCase = updateAdminStatusUseCase;
    this.deleteAdminUseCase = deleteAdminUseCase;
    this.updateAdminPermissionsUseCase = updateAdminPermissionsUseCase;
  }

  getDashboard = async (req, res, next) => {
    try {
      const dashboard = await this.getDashboardStatsUseCase.execute();

      return res.status(200).json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      return next(error);
    }
  };

  getUsers = async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);

      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

      const result = await this.getUsersUseCase.execute({
        page,

        limit,

        search: req.query.search?.trim() || "",

        sortBy: req.query.sortBy || "createdAt",

        sortOrder:
          req.query.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC",

        // Role filter
        role: req.query.role || null,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  };

  getAdmins = async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);

      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

      const result = await this.getAdminsUseCase.execute({
        page,
        limit,
        search: req.query.search?.trim() || "",
        sortBy: req.query.sortBy || "createdAt",
        sortOrder:
          req.query.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC",
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  };

  getUserById = async (req, res, next) => {
    try {
      const user = await this.getUserByIdUseCase.execute(req.params.id);

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      return next(error);
    }
  };

  updateUserRole = async (req, res, next) => {
    try {
      const result = await this.updateUserRoleUseCase.execute({
        userId: req.params.id,
        requesterId: req.user.id,
        platformRole: req.body.platformRole,
      });

      return res.status(200).json({
        success: true,
        message: "User role updated successfully.",
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  };

  createAdmin = async (req, res, next) => {
    try {
      const admin = await this.createAdminUseCase.execute(req.body);

      return res.status(201).json({
        success: true,
        message: "Admin created successfully.",
        data: admin,
      });
    } catch (error) {
      return next(error);
    }
  };

  updateAdminStatus = async (req, res, next) => {
    try {
      const result = await this.updateAdminStatusUseCase.execute({
        userId: req.params.id,
        requesterId: req.user.id,
        isActive: req.body.isActive,
      });

      return res.status(200).json({
        success: true,
        message: "Admin status updated successfully.",
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  };
  deleteUser = async (req, res, next) => {
    try {
      await this.deleteUserUseCase.execute({
        userId: req.params.id,
        requesterId: req.user.id,
      });

      return res.status(200).json({
        success: true,
        message: "User deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  };
  deleteAdmin = async (req, res, next) => {
    try {
      await this.deleteAdminUseCase.execute({
        userId: req.params.id,
        requesterId: req.user.id,
      });

      return res.status(200).json({
        success: true,
        message: "Admin deleted successfully.",
      });
    } catch (error) {
      return next(error);
    }
  };
  updateAdminPermissions = async (req, res, next) => {
    try {
      const result = await this.updateAdminPermissionsUseCase.execute({
        userId: req.params.id,
        permissions: req.body.permissions,
      });

      return res.status(200).json({
        success: true,
        message: "Admin permissions updated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
