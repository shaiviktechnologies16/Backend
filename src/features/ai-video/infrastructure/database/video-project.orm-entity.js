import { EntitySchema } from "typeorm";

export const VideoProjectOrmEntity = new EntitySchema({
  name: "VideoProject",
  tableName: "ai_video_projects",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
      default: () => "uuid_generate_v4()",
    },

    organizationId: {
      propertyName: "organizationId",
      name: "organization_id",
      type: "uuid",
      nullable: false,
    },

    projectId: {
      propertyName: "projectId",
      name: "project_id",
      type: "uuid",
      nullable: true,
    },

    createdById: {
      propertyName: "createdById",
      name: "created_by_id",
      type: "uuid",
      nullable: false,
    },

    name: {
      type: "varchar",
      length: 255,
      nullable: false,
    },

    prompt: {
      type: "text",
      nullable: false,
    },

    language: {
      type: "varchar",
      length: 20,
      nullable: false,
      default: "te",
    },

    aspectRatio: {
      propertyName: "aspectRatio",
      name: "aspect_ratio",
      type: "varchar",
      length: 20,
      nullable: false,
      default: "9:16",
    },

    duration: {
      type: "int",
      nullable: false,
      default: 30,
    },

    style: {
      type: "varchar",
      length: 50,
      nullable: false,
      default: "cartoon",
    },

    status: {
      type: "varchar",
      length: 50,
      nullable: false,
      default: "DRAFT",
    },

    script: {
      type: "jsonb",
      nullable: true,
    },

    storyboard: {
      type: "jsonb",
      nullable: true,
    },

    finalVideoUrl: {
      propertyName: "finalVideoUrl",
      name: "final_video_url",
      type: "text",
      nullable: true,
    },

    errorMessage: {
      propertyName: "errorMessage",
      name: "error_message",
      type: "text",
      nullable: true,
    },

    metadata: {
      type: "jsonb",
      nullable: true,
    },

    createdAt: {
      propertyName: "createdAt",
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },

    updatedAt: {
      propertyName: "updatedAt",
      name: "updated_at",
      type: "timestamp",
      updateDate: true,
    },
  },
});
