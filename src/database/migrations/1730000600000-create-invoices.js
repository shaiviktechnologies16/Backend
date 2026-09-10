import { Table, TableIndex } from "typeorm";

export class CreateInvoices1730000600000 {
  name = "CreateInvoices1730000600000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "invoices",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "invoice_number",
            type: "varchar",
            length: "50",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "organization_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "payment_order_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "subscription_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "plan_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "customer_name",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "customer_email",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "billing_address",
            type: "text",
            isNullable: true,
          },
          {
            name: "billing_interval",
            type: "varchar",
            length: "50",
            isNullable: false,
            default: "'MONTHLY'",
          },
          {
            name: "subtotal",
            type: "numeric",
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: "discount",
            type: "numeric",
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: "tax",
            type: "numeric",
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: "total_paid",
            type: "numeric",
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: "currency",
            type: "varchar",
            length: "10",
            default: "'INR'",
          },
          {
            name: "status",
            type: "varchar",
            length: "50",
            default: "'GENERATED'",
          },
          {
            name: "pdf_path",
            type: "varchar",
            length: "500",
            isNullable: true,
          },
          {
            name: "payment_date",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "subscription_start_date",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "subscription_end_date",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "razorpay_order_id",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "razorpay_payment_id",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "whatsapp_connection_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "whatsapp_message_id",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "whatsapp_delivery_status",
            type: "varchar",
            length: "50",
            default: "'PENDING'",
          },
          {
            name: "whatsapp_delivery_error",
            type: "text",
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
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices("invoices", [
      new TableIndex({
        name: "IDX_INVOICES_ORGANIZATION_ID",
        columnNames: ["organization_id"],
      }),
      new TableIndex({
        name: "IDX_INVOICES_INVOICE_NUMBER",
        columnNames: ["invoice_number"],
      }),
      new TableIndex({
        name: "IDX_INVOICES_RAZORPAY_PAYMENT_ID",
        columnNames: ["razorpay_payment_id"],
      }),
      new TableIndex({
        name: "IDX_INVOICES_RAZORPAY_ORDER_ID",
        columnNames: ["razorpay_order_id"],
      }),
    ]);
  }

  async down(queryRunner) {
    await queryRunner.dropTable("invoices");
  }
}
