import { PlatformRole } from "../../domain/constants/platform-role.js";

export class GetAdminsUseCase {
  constructor(adminRepository) {
    this.adminRepository = adminRepository;
  }

  async execute(query) {
    const result = await this.adminRepository.getUsers({
      ...query,
      roles: [PlatformRole.PLATFORM_ADMIN, PlatformRole.PLATFORM_MANAGER],
    });

    return {
      admins: result.users,
      pagination: result.pagination,
    };
  }
}
