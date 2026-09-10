import { EntitySchema } from "typeorm";

import { ProjectMemberRole } from "../../domain/constants/project-member-role.js";

export const ProjectMemberOrmEntity = new EntitySchema({
  name: "ProjectMember",

  tableName: "project_members",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    projectId: {
      name: "project_id",
      type: "uuid",
      nullable: false,
    },

    userId: {
      name: "user_id",
      type: "uuid",
      nullable: false,
    },

    role: {
      type: "varchar",
      length: 50,
      default: ProjectMemberRole.MEMBER,
    },

    createdAt: {
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },
    status: {
      type: "varchar",
      length: 20,
      default: "ACTIVE",
    },

    removedAt: {
      name: "removed_at",
      type: "timestamp",
      nullable: true,
    },
  },

  relations: {
    project: {
      type: "many-to-one",
      target: "Project",
      inverseSide: "projectMembers",
      joinColumn: {
        name: "project_id",
      },
      onDelete: "CASCADE",
    },

    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "user_id",
      },
      onDelete: "CASCADE",
    },
  },
});
