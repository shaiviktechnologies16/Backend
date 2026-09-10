import { Table } from "typeorm";

export class CreatePlans1723000160000 {
  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "plans",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "name",
            type: "varchar",
            length: "100",
          },
          {
            name: "code",
            type: "varchar",
            length: "50",
            isUnique: true,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "is_active",
            type: "boolean",
            default: true,
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
      }),
      true,
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("plans");
  }
}
