import { EntitySchema } from "typeorm";

export const KnowledgeChunkOrmEntity = new EntitySchema({
  name: "KnowledgeChunk",
  tableName: "knowledge_chunks",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    knowledgeSourceId: {
      propertyName: "knowledgeSourceId",
      name: "knowledge_source_id",
      type: "uuid",
      nullable: false,
    },

    projectId: {
      propertyName: "projectId",
      name: "project_id",
      type: "uuid",
      nullable: false,
    },

    content: {
      type: "text",
      nullable: false,
    },

    chunkIndex: {
      propertyName: "chunkIndex",
      name: "chunk_index",
      type: "int",
      nullable: false,
    },

    metadata: {
      type: "jsonb",
      nullable: true,
    },

    embedding: {
      type: "vector",
      length: 768,
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
    knowledgeSource: {
      type: "many-to-one",
      target: "KnowledgeSource",
      joinColumn: {
        name: "knowledge_source_id",
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
      onDelete: "CASCADE",
    },
  },
});
