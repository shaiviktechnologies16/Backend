export class UpdateProfileUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute({ userId, name, phone }) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }

    if (name !== undefined) {
      user.name = name;
    }

    if (phone !== undefined) {
      user.phone = phone || null;
    }

    return this.userRepository.update(user);
  }
}
