import { EntitySchema } from "typeorm";

export const KnowledgeSourceOrmEntity = new EntitySchema({
  name: "KnowledgeSource",
  tableName: "knowledge_sources",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    projectId: {
      propertyName: "projectId",
      name: "project_id",
      type: "uuid",
      nullable: false,
    },

    name: {
      type: "varchar",
      length: 255,
      nullable: false,
    },

    type: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    sourceUrl: {
      propertyName: "sourceUrl",
      name: "source_url",
      type: "text",
      nullable: true,
    },

    filePath: {
      propertyName: "filePath",
      name: "file_path",
      type: "text",
      nullable: true,
    },

    content: {
      type: "text",
      nullable: true,
    },

    status: {
      type: "varchar",
      length: 50,
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

    deletedAt: {
      propertyName: "deletedAt",
      name: "deleted_at",
      type: "timestamp",
      nullable: true,
      deleteDate: true,
    },
  },

  relations: {
    project: {
      type: "many-to-one",
      target: "Project",
      joinColumn: {
        name: "project_id",
        referencedColumnName: "id",
      },
      onDelete: "CASCADE",
    },
  },
});
