import { EntitySchema } from "typeorm";

export const WorkspaceApiKeyOrmEntity = new EntitySchema({
  name: "WorkspaceApiKey",
  tableName: "workspace_api_keys",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    organizationId: {
      propertyName: "organizationId",
      name: "organization_id",
      type: "uuid",
      nullable: false,
    },

    name: {
      type: "varchar",
      length: 100,
      nullable: false,
    },

    description: {
      type: "text",
      nullable: true,
    },

    encryptedValue: {
      propertyName: "encryptedValue",
      name: "encrypted_value",
      type: "text",
      nullable: false,
    },

    createdBy: {
      propertyName: "createdBy",
      name: "created_by",
      type: "uuid",
      nullable: false,
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

  relations: {
    organization: {
      type: "many-to-one",
      target: "Organization",
      joinColumn: {
        name: "organization_id",
        referencedColumnName: "id",
      },
      onDelete: "CASCADE",
    },

    createdByUser: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "created_by",
        referencedColumnName: "id",
      },
      onDelete: "RESTRICT",
    },
  },
});
