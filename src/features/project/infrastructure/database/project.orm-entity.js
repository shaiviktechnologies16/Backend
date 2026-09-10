import { EntitySchema } from "typeorm";

import { ProjectStatus } from "../../domain/constants/project-status.js";

export const ProjectOrmEntity = new EntitySchema({
  name: "Project",
  tableName: "projects",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    organizationId: {
      name: "organization_id",
      type: "uuid",
      nullable: false,
    },

    name: {
      type: "varchar",
      length: 255,
      nullable: false,
    },

    description: {
      type: "text",
      nullable: true,
    },

    status: {
      type: "enum",
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.ACTIVE,
    },

    createdBy: {
      name: "created_by",
      type: "uuid",
      nullable: false,
    },

    createdAt: {
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },

    updatedAt: {
      name: "updated_at",
      type: "timestamp",
      updateDate: true,
    },

    deletedAt: {
      name: "deleted_at",
      type: "timestamp",
      nullable: true,
      deleteDate: true,
    },
  },

  relations: {
    organization: {
      type: "many-to-one",
      target: "Organization",
      joinColumn: {
        name: "organization_id",
      },
      onDelete: "CASCADE",
    },

    createdByUser: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "created_by",
      },
    },

    agents: {
      type: "one-to-many",
      target: "Agent",
      inverseSide: "project",
    },

    projectMembers: {
      type: "one-to-many",
      target: "ProjectMember",
      inverseSide: "project",
    },
  },
});
