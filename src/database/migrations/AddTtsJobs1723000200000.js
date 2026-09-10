import { Table, TableColumn } from "typeorm";

export class AddTtsJobs1723000200000 {
  name = "AddTtsJobs1723000200000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "tts_jobs",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          {
            name: "text",
            type: "text",
            isNullable: false,
          },
          {
            name: "status",
            type: "varchar",
            length: "30",
            default: "'queued'",
          },
          {
            name: "total_groups",
            type: "int",
            default: 0,
          },
          {
            name: "completed_groups",
            type: "int",
            default: 0,
          },
          {
            name: "progress",
            type: "int",
            default: 0,
          },
          {
            name: "output_path",
            type: "text",
            isNullable: true,
          },
          {
            name: "output_filename",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "error_message",
            type: "text",
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
      true,
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("tts_jobs");
  }
}
