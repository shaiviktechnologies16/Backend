import { Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateOrganizationEnquiryNotificationRecipients1730000300000 {
  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "organization_enquiry_notification_recipients",
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
            name: "organization_member_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "channel",
            type: "varchar",
            length: "30",
            default: "'WHATSAPP'",
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
      }),
      true,
    );

    await queryRunner.createForeignKeys(
      "organization_enquiry_notification_recipients",
      [
        new TableForeignKey({
          columnNames: ["organization_id"],
          referencedTableName: "organizations",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        }),
        new TableForeignKey({
          columnNames: ["organization_member_id"],
          referencedTableName: "organization_members",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        }),
      ],
    );

    await queryRunner.createIndex(
      "organization_enquiry_notification_recipients",
      new TableIndex({
        name: "IDX_ENQUIRY_NOTIFICATION_RECIPIENT_ORGANIZATION",
        columnNames: ["organization_id"],
      }),
    );

    await queryRunner.createIndex(
      "organization_enquiry_notification_recipients",
      new TableIndex({
        name: "IDX_ENQUIRY_NOTIFICATION_RECIPIENT_MEMBER_CHANNEL",
        columnNames: ["organization_member_id", "channel"],
        isUnique: true,
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable(
      "organization_enquiry_notification_recipients",
      true,
    );
  }
}
