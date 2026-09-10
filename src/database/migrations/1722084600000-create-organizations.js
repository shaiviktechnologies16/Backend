import { Table } from "typeorm";

export class CreateOrganizations1722084600000 {
  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "organizations",
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
            length: "255",
          },
          {
            name: "slug",
            type: "varchar",
            length: "255",
            isUnique: true,
          },
          {
            name: "owner_id",
            type: "uuid",
          },
          {
            name: "logo",
            type: "text",
            isNullable: true,
          },
          {
            name: "website",
            type: "varchar",
            length: "255",
            isNullable: true,
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
            name: "monthly_message_limit",
            type: "integer",
            default: 1000,
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
          {
            name: "deleted_at",
            type: "timestamp",
            isNullable: true,
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("organizations");
  }
}
