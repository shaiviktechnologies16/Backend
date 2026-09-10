import { ProjectMemberRole } from "../constants/project-member-role.js";
import { AppError } from "../../../../common/errors/AppError.js";

export class ProjectMember {
  constructor({
    id = null,
    name = null,
    email = null,
    projectId,
    userId,
    role = ProjectMemberRole.MEMBER,
    status = "ACTIVE",
    removedAt = null,
    createdAt = null,
  }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.projectId = projectId;
    this.userId = userId;
    this.role = role;
    this.status = status;
    this.removedAt = removedAt;
    this.createdAt = createdAt;
  }

  changeRole(role) {
    if (!Object.values(ProjectMemberRole).includes(role)) {
      throw new AppError(
        "Invalid project member role.",
        400,
        "INVALID_PROJECT_MEMBER_ROLE",
      );
    }

    this.role = role;
  }

  remove() {
    this.status = "REMOVED";
    this.removedAt = new Date();
  }

  restore() {
    this.status = "ACTIVE";
    this.removedAt = null;
  }

  isActive() {
    return this.status === "ACTIVE";
  }

  isRemoved() {
    return this.status === "REMOVED";
  }

  isOwner() {
    return this.role === ProjectMemberRole.OWNER;
  }

  isAdmin() {
    return this.role === ProjectMemberRole.ADMIN;
  }

  isMember() {
    return this.role === ProjectMemberRole.MEMBER;
  }

  isViewer() {
    return this.role === ProjectMemberRole.VIEWER;
  }
}
