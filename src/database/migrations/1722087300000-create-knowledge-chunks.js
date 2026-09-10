import { Table, TableForeignKey, TableIndex, TableUnique } from "typeorm";

export class CreateKnowledgeChunks1722087300000 {
  name = "CreateKnowledgeChunks1722087300000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "knowledge_chunks",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "knowledge_source_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "project_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "content",
            type: "text",
            isNullable: false,
          },
          {
            name: "chunk_index",
            type: "int",
            isNullable: false,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys("knowledge_chunks", [
      new TableForeignKey({
        name: "fk_knowledge_chunks_source",
        columnNames: ["knowledge_source_id"],
        referencedTableName: "knowledge_sources",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
      new TableForeignKey({
        name: "fk_knowledge_chunks_project",
        columnNames: ["project_id"],
        referencedTableName: "projects",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    ]);

    await queryRunner.createUniqueConstraint(
      "knowledge_chunks",
      new TableUnique({
        name: "uq_knowledge_chunk_source_index",
        columnNames: ["knowledge_source_id", "chunk_index"],
      }),
    );

    await queryRunner.createIndex(
      "knowledge_chunks",
      new TableIndex({
        name: "idx_knowledge_chunks_project_id",
        columnNames: ["project_id"],
      }),
    );

    await queryRunner.createIndex(
      "knowledge_chunks",
      new TableIndex({
        name: "idx_knowledge_chunks_source_id",
        columnNames: ["knowledge_source_id"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("knowledge_chunks");
  }
}
