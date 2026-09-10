import { EntitySchema } from "typeorm";

export const WhatsappConnectionOrmEntity = new EntitySchema({
  name: "WhatsappConnection",
  tableName: "whatsapp_connections",

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
      length: 255,
      nullable: false,
    },

    provider: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    phoneNumber: {
      propertyName: "phoneNumber",
      name: "phone_number",
      type: "varchar",
      length: 50,
      nullable: true,
    },

    phoneNumberId: {
      propertyName: "phoneNumberId",
      name: "phone_number_id",
      type: "varchar",
      length: 255,
      nullable: true,
    },

    businessAccountId: {
      propertyName: "businessAccountId",
      name: "business_account_id",
      type: "varchar",
      length: 255,
      nullable: true,
    },

    status: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    qualityRating: {
      propertyName: "qualityRating",
      name: "quality_rating",
      type: "varchar",
      length: 50,
      nullable: true,
    },

    projectId: {
      propertyName: "projectId",
      name: "project_id",
      type: "uuid",
      nullable: true,
    },

    agentId: {
      propertyName: "agentId",
      name: "agent_id",
      type: "uuid",
      nullable: true,
    },

    credentials: {
      type: "jsonb",
      nullable: true,
    },

    metadata: {
      type: "jsonb",
      nullable: false,
      default: {},
    },

    lastConnectedAt: {
      propertyName: "lastConnectedAt",
      name: "last_connected_at",
      type: "timestamp",
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

    project: {
      type: "many-to-one",
      target: "Project",
      joinColumn: {
        name: "project_id",
        referencedColumnName: "id",
      },
      onDelete: "SET NULL",
    },

    agent: {
      type: "many-to-one",
      target: "Agent",
      joinColumn: {
        name: "agent_id",
        referencedColumnName: "id",
      },
      onDelete: "SET NULL",
    },
  },
});
