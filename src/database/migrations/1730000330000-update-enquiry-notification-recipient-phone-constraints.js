export class UpdateEnquiryNotificationRecipientPhoneConstraints1730000330000 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "organization_enquiry_notification_recipients"
      ALTER COLUMN "organization_member_id" DROP NOT NULL
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_ENQUIRY_NOTIFICATION_RECIPIENT_MEMBER_CHANNEL"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_ENQUIRY_NOTIFICATION_RECIPIENT_ORGANIZATION_PHONE_CHANNEL"
      ON "organization_enquiry_notification_recipients"
      ("organization_id", "recipient_phone_number", "channel")
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_ENQUIRY_NOTIFICATION_RECIPIENT_ORGANIZATION_PHONE_CHANNEL"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_ENQUIRY_NOTIFICATION_RECIPIENT_MEMBER_CHANNEL"
      ON "organization_enquiry_notification_recipients"
      ("organization_member_id", "channel")
    `);

    await queryRunner.query(`
      ALTER TABLE "organization_enquiry_notification_recipients"
      ALTER COLUMN "organization_member_id" SET NOT NULL
    `);
  }
}
