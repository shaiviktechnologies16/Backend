import { EntitySchema } from "typeorm";

export const OrganizationModelAccessOrmEntity = new EntitySchema({
  name: "OrganizationModelAccess",

  tableName: "organization_model_access",

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

    aiModelId: {
      name: "ai_model_id",
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

    aiModel: {
      type: "many-to-one",
      target: "AIModel",
      joinColumn: {
        name: "ai_model_id",
      },
      onDelete: "CASCADE",
    },
  },
});
