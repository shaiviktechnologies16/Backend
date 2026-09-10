import { Table, TableForeignKey, TableUnique } from "typeorm";

export class CreateOrganizationModelAccess1722154000000 {
  name = "CreateOrganizationModelAccess1722154000000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "organization_model_access",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "organization_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "ai_model_id",
            type: "uuid",
            isNullable: false,
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
            name: "UQ_organization_model_access",
            columnNames: ["organization_id", "ai_model_id"],
          }),
        ],
      }),
    );

    await queryRunner.createForeignKeys("organization_model_access", [
      new TableForeignKey({
        columnNames: ["organization_id"],
        referencedTableName: "organizations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
      new TableForeignKey({
        columnNames: ["ai_model_id"],
        referencedTableName: "ai_models",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    ]);
  }

  async down(queryRunner) {
    await queryRunner.dropTable("organization_model_access");
  }
}
