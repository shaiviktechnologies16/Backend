import { User } from "../../entity/user.entity.js";
import { UserRepository } from "../interfaces/user.repository.js";
import { UserOrm } from "../../../../database/entities/user.orm.js";

export class PostgresUserRepository extends UserRepository {
  constructor(dataSource) {
    super();

    this.dataSource = dataSource;

    this.repository = dataSource.getRepository(UserOrm);
  }

  getRepository(manager = null) {
    return manager ? manager.getRepository(UserOrm) : this.repository;
  }

  async create(user, manager = null) {
    const repository = this.getRepository(manager);

    const entity = repository.create(this.toPersistence(user));

    await repository.save(entity);

    return this.findById(entity.id, manager);
  }

  async findById(id, manager = null) {
    const repository = (manager ?? this.dataSource).getRepository(UserOrm);

    return repository.findOne({
      where: {
        id,
      },
      relations: {
        role: true,
      },
    });
  }

  async findByEmail(email, manager = null) {
    const repository = this.getRepository(manager);

    const entity = await repository.findOne({
      where: { email },
      relations: {
        role: true,
      },
    });

    return entity ? this.toDomain(entity) : null;
  }

  async update(user, manager = null) {
    const repository = this.getRepository(manager);

    await repository.save(this.toPersistence(user));

    return this.findById(user.id, manager);
  }

  async updateStatus(userId, isActive) {
    const repository = this.repository;

    await repository.update(
      {
        id: userId,
      },
      {
        isActive,
      },
    );

    return this.findById(userId);
  }

  async delete(id, manager = null) {
    const repository = this.getRepository(manager);

    await repository.delete(id);
  }

  toPersistence(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      platformRole: user.platformRole,

      phone: user.phone,
      profilePhotoUploadId: user.profilePhotoUploadId,

      isActive: user.isActive,

      role: user.role
        ? {
            id: user.role.id,
          }
        : null,

      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  toDomain(entity) {
    return new User({
      id: entity.id,
      name: entity.name,
      email: entity.email,
      passwordHash: entity.passwordHash,
      platformRole: entity.platformRole,

      phone: entity.phone,
      profilePhotoUploadId: entity.profilePhotoUploadId,

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
