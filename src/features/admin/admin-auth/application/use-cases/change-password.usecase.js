import { AppError } from "../../../../../common/errors/AppError.js";

export class ChangePasswordUseCase {
  constructor({
    adminAuthRepository,
    passwordService,
    adminSessionRepository,
  }) {
    this.adminAuthRepository = adminAuthRepository;
    this.passwordService = passwordService;
    this.adminSessionRepository = adminSessionRepository;
  }

  async execute({ userId, currentPassword, newPassword }) {
    const user = await this.adminAuthRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const valid = await this.passwordService.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!valid) {
      throw new AppError(
        "Current password is incorrect",
        400,
        "INVALID_CURRENT_PASSWORD",
      );
    }
    const passwordHash = await this.passwordService.hash(newPassword);
    await this.adminAuthRepository.updatePassword(userId, passwordHash);
    await this.adminSessionRepository.deleteByUserId(userId);
    return {
      message: "Password changed successfully",
    };
  }
}
