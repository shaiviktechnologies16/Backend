import { Table } from "typeorm";

export class CreateOrganizationMembers1722084700000 {
  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "organization_members",
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
          },
          {
            name: "user_id",
            type: "uuid",
          },
          {
            name: "role",
            type: "varchar",
            length: "20",
          },
          {
            name: "invited_by",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "joined_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
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
          {
            name: "UQ_ORGANIZATION_USER",
            columnNames: ["organization_id", "user_id"],
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("organization_members");
  }
}
