import crypto from "crypto";
import { PlatformRole } from "../../admin/domain/constants/platform-role.js";

export class User {
  constructor({
    id = crypto.randomUUID(),
    name,
    email,
    passwordHash,

    platformRole = PlatformRole.USER,
    role = null,

    phone = null,
    profilePhotoUploadId = null,

    isActive = true,

    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;

    this.platformRole = platformRole;
    this.role = role;

    this.phone = phone;
    this.profilePhotoUploadId = profilePhotoUploadId;

    this.isActive = isActive;

    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  getRoleName() {
    return this.role?.name ?? this.platformRole;
  }

  isSuperAdmin() {
    return this.getRoleName() === PlatformRole.PLATFORM_ADMIN;
  }

  isAdmin() {
    return this.getRoleName() === PlatformRole.PLATFORM_ADMIN;
  }

  isUser() {
    return this.getRoleName() === PlatformRole.USER;
  }
}
