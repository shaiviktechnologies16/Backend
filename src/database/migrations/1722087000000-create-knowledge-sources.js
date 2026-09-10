import { Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateKnowledgeSources1722087000000 {
  name = "CreateKnowledgeSources1722087000000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "knowledge_sources",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "project_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "name",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "type",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "source_url",
            type: "text",
            isNullable: true,
          },
          {
            name: "file_path",
            type: "text",
            isNullable: true,
          },
          {
            name: "content",
            type: "text",
            isNullable: true,
          },
          {
            name: "status",
            type: "varchar",
            length: "50",
            default: "'PENDING'",
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
          {
            name: "deleted_at",
            type: "timestamp",
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "knowledge_sources",
      new TableForeignKey({
        columnNames: ["project_id"],
        referencedTableName: "projects",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createIndex(
      "knowledge_sources",
      new TableIndex({
        name: "idx_knowledge_sources_project_id",
        columnNames: ["project_id"],
      }),
    );

    await queryRunner.createIndex(
      "knowledge_sources",
      new TableIndex({
        name: "idx_knowledge_sources_status",
        columnNames: ["status"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropIndex(
      "knowledge_sources",
      "idx_knowledge_sources_status",
    );

    await queryRunner.dropIndex(
      "knowledge_sources",
      "idx_knowledge_sources_project_id",
    );

    await queryRunner.dropTable("knowledge_sources");
  }
}
