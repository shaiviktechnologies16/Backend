import { Table } from "typeorm";

export class CreatePlanUsageLimits1723000170000 {
  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "plan_usage_limits",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "plan_id",
            type: "uuid",
            isUnique: true,
          },
          {
            name: "requests_per_day",
            type: "int",
            isNullable: true,
          },
          {
            name: "requests_per_month",
            type: "int",
            isNullable: true,
          },
          {
            name: "tokens_per_day",
            type: "int",
            isNullable: true,
          },
          {
            name: "tokens_per_month",
            type: "int",
            isNullable: true,
          },
          {
            name: "conversations_per_day",
            type: "int",
            isNullable: true,
          },
          {
            name: "conversations_per_month",
            type: "int",
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
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
        foreignKeys: [
          {
            columnNames: ["plan_id"],
            referencedTableName: "plans",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("plan_usage_limits");
  }
}
