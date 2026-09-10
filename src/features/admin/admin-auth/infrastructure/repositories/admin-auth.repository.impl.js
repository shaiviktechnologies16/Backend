import { AdminEntity } from "../../domain/entities/admin.entity.js";
import { AdminAuthRepository } from "../../domain/repositories/admin-auth.repository.js";

export class AdminAuthRepositoryImpl extends AdminAuthRepository {
  constructor(dataSource) {
    super();

    this.dataSource = dataSource;
    this.repository = dataSource.getRepository("User");
  }

  getRepository(manager = null) {
    return manager ? manager.getRepository("User") : this.repository;
  }

  async findByEmail(email, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: {
        email,
      },
      relations: {
        role: true,
      },
    });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findById(id, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: {
        id,
      },
      relations: {
        role: true,
      },
    });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findPlatformAdmin(manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: {
        platformRole: "PLATFORM_ADMIN",
      },
      relations: {
        role: true,
      },
    });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findSuperAdmin(manager = null) {
    return this.findPlatformAdmin(manager);
  }
  async createAdmin(admin, manager = null) {
    const repository = this.getRepository(manager);

    const entity = repository.create({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      passwordHash: admin.passwordHash,
      platformRole: admin.platformRole,

      role: admin.role
        ? {
            id: admin.role.id,
          }
        : null,

      isActive: true,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    });

    const savedEntity = await repository.save(entity);

    return this.toDomain(savedEntity);
  }

  async updatePassword(userId, passwordHash, manager = null) {
    const repository = this.getRepository(manager);

    await repository.update(userId, {
      passwordHash,
    });
  }

  async updateRefreshToken(userId, refreshToken) {
    return;
  }

  async clearRefreshToken(userId) {
    return;
  }

  toDomain(entity) {
    return new AdminEntity({
      id: entity.id,
      name: entity.name,
      email: entity.email,
      passwordHash: entity.passwordHash,
      platformRole: entity.platformRole,
      role: entity.role
        ? {
            id: entity.role.id,
            name: entity.role.name,
            description: entity.role.description,
          }
        : null,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
