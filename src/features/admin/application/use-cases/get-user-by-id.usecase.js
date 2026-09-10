import { AppError } from "../../../../common/errors/AppError.js";

export class GetUserByIdUseCase {
  constructor(adminRepository) {
    this.adminRepository = adminRepository;
  }

  async execute(id) {
    const user = await this.adminRepository.getUserById(id);

    if (!user) {
      throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    }

    return user;
  }
}
