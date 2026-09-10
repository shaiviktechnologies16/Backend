import { EntitySchema } from "typeorm";

export const UploadOrmEntity = new EntitySchema({
  name: "Upload",
  tableName: "uploads",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    purpose: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    uploadedBy: {
      propertyName: "uploadedBy",
      name: "uploaded_by",
      type: "uuid",
      nullable: false,
    },

    organizationId: {
      propertyName: "organizationId",
      name: "organization_id",
      type: "uuid",
      nullable: true,
    },

    projectId: {
      propertyName: "projectId",
      name: "project_id",
      type: "uuid",
      nullable: true,
    },

    originalName: {
      propertyName: "originalName",
      name: "original_name",
      type: "varchar",
      length: 255,
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

    storageProvider: {
      propertyName: "storageProvider",
      name: "storage_provider",
      type: "varchar",
      length: 50,
      nullable: true,
    },

    storageKey: {
      propertyName: "storageKey",
      name: "storage_key",
      type: "text",
      nullable: true,
    },

    storageUrl: {
      propertyName: "storageUrl",
      name: "storage_url",
      type: "text",
      nullable: true,
    },

    sourceUrl: {
      propertyName: "sourceUrl",
      name: "source_url",
      type: "text",
      nullable: true,
    },

    status: {
      type: "varchar",
      length: 50,
      nullable: false,
      default: "PENDING",
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
