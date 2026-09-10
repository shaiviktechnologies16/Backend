import { TableColumn } from "typeorm";

export class AddRecipientPhoneNumberToEnquiryNotificationRecipients1730000300001 {
  async up(queryRunner) {
    const table = await queryRunner.getTable(
      "organization_enquiry_notification_recipients",
    );

    const existingColumn = table?.findColumnByName("recipient_phone_number");

    if (!existingColumn) {
      await queryRunner.addColumn(
        "organization_enquiry_notification_recipients",
        new TableColumn({
          name: "recipient_phone_number",
          type: "varchar",
          length: "50",
          isNullable: true,
        }),
      );
    }
  }

  async down(queryRunner) {
    const table = await queryRunner.getTable(
      "organization_enquiry_notification_recipients",
    );

    const existingColumn = table?.findColumnByName("recipient_phone_number");

    if (existingColumn) {
      await queryRunner.dropColumn(
        "organization_enquiry_notification_recipients",
        "recipient_phone_number",
      );
    }
  }
}
