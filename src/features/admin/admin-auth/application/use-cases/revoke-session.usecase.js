import { AppError } from "../../../../../common/errors/AppError.js";

export class RevokeSessionUseCase {
  constructor({ adminSessionRepository }) {
    this.adminSessionRepository = adminSessionRepository;
  }

  async execute({ sessionId, userId }) {
    const result = await this.adminSessionRepository.deleteById(
      sessionId,
      userId,
    );

    if (!result.affected) {
      throw new AppError("Session not found.", 404, "SESSION_NOT_FOUND");
    }

    return {
      message: "Session revoked successfully.",
    };
  }
}
