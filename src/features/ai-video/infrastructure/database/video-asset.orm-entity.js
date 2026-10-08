import { EntitySchema } from "typeorm";

export const VideoAssetOrmEntity = new EntitySchema({
  name: "VideoAsset",
  tableName: "ai_video_assets",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
      default: () => "uuid_generate_v4()",
    },

    videoProjectId: {
      propertyName: "videoProjectId",
      name: "video_project_id",
      type: "uuid",
      nullable: false,
    },

    sceneId: {
      propertyName: "sceneId",
      name: "scene_id",
      type: "uuid",
      nullable: true,
    },

    type: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    provider: {
      type: "varchar",
      length: 50,
      nullable: false,
      default: "system",
    },

    url: {
      type: "text",
      nullable: false,
    },

    storageKey: {
      propertyName: "storageKey",
      name: "storage_key",
      type: "text",
      nullable: true,
    },

    mimeType: {
      propertyName: "mimeType",
      name: "mime_type",
      type: "varchar",
      length: 150,
      nullable: true,
    },

    size: {
      type: "bigint",
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
