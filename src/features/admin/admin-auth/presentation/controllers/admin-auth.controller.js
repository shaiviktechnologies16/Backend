import { asyncHandler } from "../../../../../common/utils/asyncHandler.js";

import { AdminLoginDto } from "../../application/dto/admin-login.dto.js";

export class AdminAuthController {
  constructor({
    adminLoginUseCase,
    bootstrapAdminUseCase,
    createAdminUseCase,
    getAdminProfileUseCase,
    changePasswordUseCase,
    refreshTokenUseCase,
    logoutUseCase,
    getSessionsUseCase,
    logoutAllSessionsUseCase,
    revokeSessionUseCase,
  }) {
    this.adminLoginUseCase = adminLoginUseCase;
    this.bootstrapAdminUseCase = bootstrapAdminUseCase;
    this.createAdminUseCase = createAdminUseCase;
    this.getAdminProfileUseCase = getAdminProfileUseCase;
    this.changePasswordUseCase = changePasswordUseCase;
    this.refreshTokenUseCase = refreshTokenUseCase;
    this.logoutUseCase = logoutUseCase;
    this.getSessionsUseCase = getSessionsUseCase;
    this.logoutAllSessionsUseCase = logoutAllSessionsUseCase;
    this.revokeSessionUseCase = revokeSessionUseCase;
  }
  /**
   * First time platform setup.
   * Creates PLATFORM_ADMIN using ADMIN_SETUP_TOKEN
   */
  bootstrap = asyncHandler(async (req, res) => {
    const admin = await this.bootstrapAdminUseCase.execute(req.body);

    return res.status(201).json({
      success: true,
      message: "Super admin created successfully.",
      data: admin,
    });
  });

  me = asyncHandler(async (req, res) => {
    const profile = await this.getAdminProfileUseCase.execute(req.user.id);

    return res.status(200).json({
      success: true,
      data: profile,
    });
  });

  /**
   * Existing PLATFORM_ADMIN creates admin users
   */
  createAdmin = asyncHandler(async (req, res) => {
    const admin = await this.createAdminUseCase.execute(req.body);

    return res.status(201).json({
      success: true,
      message: "Admin created successfully.",
      data: admin,
    });
  });

  /**
   * Admin login
   */
  login = asyncHandler(async (req, res) => {
    const dto = new AdminLoginDto(req.body);

    const result = await this.adminLoginUseCase.execute(dto, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    return res.status(200).json(result);
  });
  /**
   * Change logged-in admin password
   */
  changePassword = asyncHandler(async (req, res) => {
    const result = await this.changePasswordUseCase.execute({
      userId: req.user.id,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
      data: result,
    });
  });

  sessions = asyncHandler(async (req, res) => {
    const sessions = await this.getSessionsUseCase.execute(req.user.id);

    return res.status(200).json({
      success: true,
      data: sessions,
    });
  });

  async refreshToken(req, res, next) {
    try {
      const result = await this.refreshTokenUseCase.execute(
        req.body.refreshToken,
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const result = await this.logoutUseCase.execute(req.body.refreshToken);

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
  logoutAll = asyncHandler(async (req, res) => {
    const result = await this.logoutAllSessionsUseCase.execute(req.user.id);

    return res.json({
      success: true,
      message: result.message,
    });
  });
  revokeSession = asyncHandler(async (req, res) => {
    const result = await this.revokeSessionUseCase.execute({
      sessionId: req.params.sessionId,
      userId: req.user.id,
    });

    return res.json({
      success: true,
      message: result.message,
    });
  });
}
