import { Table, TableForeignKey, TableUnique } from "typeorm";

export class CreateOrganizationFeatureAccess1730000320000 {
  name = "CreateOrganizationFeatureAccess1730000320000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "organization_feature_access",
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
            name: "feature",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "enabled",
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
          },
        ],
        uniques: [
          new TableUnique({
            name: "UQ_organization_feature_access",
            columnNames: ["organization_id", "feature"],
          }),
        ],
      }),
    );

    await queryRunner.createForeignKey(
      "organization_feature_access",
      new TableForeignKey({
        columnNames: ["organization_id"],
        referencedTableName: "organizations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("organization_feature_access");
  }
}
