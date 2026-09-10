import { Table, TableForeignKey, TableIndex, TableUnique } from "typeorm";

export class CreateWorkspaceApiKeys1722087600000 {
  name = "CreateWorkspaceApiKeys1722087600000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "workspace_api_keys",
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
            name: "name",
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
            name: "encrypted_value",
            type: "text",
            isNullable: false,
          },
          {
            name: "created_by",
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
      }),
    );

    await queryRunner.createForeignKey(
      "workspace_api_keys",
      new TableForeignKey({
        name: "fk_workspace_api_keys_organization",
        columnNames: ["organization_id"],
        referencedTableName: "organizations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "workspace_api_keys",
      new TableForeignKey({
        name: "fk_workspace_api_keys_created_by",
        columnNames: ["created_by"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "RESTRICT",
      }),
    );

    await queryRunner.createUniqueConstraint(
      "workspace_api_keys",
      new TableUnique({
        name: "uq_workspace_api_keys_organization_name",
        columnNames: ["organization_id", "name"],
      }),
    );

    await queryRunner.createIndex(
      "workspace_api_keys",
      new TableIndex({
        name: "idx_workspace_api_keys_organization_id",
        columnNames: ["organization_id"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("workspace_api_keys");
  }
}
