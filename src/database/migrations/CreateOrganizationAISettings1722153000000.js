import { Table, TableUnique } from "typeorm";

export class CreateAIModels1722153000000 {
  name = "CreateAIModels1722153000000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "ai_models",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "provider",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "model",
            type: "varchar",
            length: "100",
            isNullable: false,
          },
          {
            name: "display_name",
            type: "varchar",
            length: "100",
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "status",
            type: "varchar",
            length: "20",
            default: "'ACTIVE'",
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
        uniques: [
          new TableUnique({
            name: "UQ_ai_models_provider_model",
            columnNames: ["provider", "model"],
          }),
        ],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("ai_models");
  }
}
