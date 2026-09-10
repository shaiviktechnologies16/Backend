import { AppError } from "../../../../common/errors/AppError.js";

export class RequirePlatformRoleUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ userId, allowedRoles }) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }

    if (!allowedRoles.includes(user.platformRole)) {
      throw new AppError("Access denied.", 403, "ACCESS_DENIED");
    }

    return true;
  }
}
