import { EntitySchema } from "typeorm";

export const AgentToolCredentialOrmEntity = new EntitySchema({
  name: "AgentToolCredential",
  tableName: "agent_tool_credentials",

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

    type: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    encryptedValue: {
      propertyName: "encryptedValue",
      name: "encrypted_value",
      type: "text",
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
  },
});
