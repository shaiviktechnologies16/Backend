import { Table, TableForeignKey, TableIndex } from "typeorm";

export class CreatePaymentOrders1730000500000 {
  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "payment_orders",
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
            name: "plan_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "razorpay_order_id",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "razorpay_payment_id",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "razorpay_signature",
            type: "varchar",
            length: "512",
            isNullable: true,
          },
          {
            name: "amount",
            type: "integer",
            isNullable: false,
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
            default: "'CREATED'",
          },
          {
            name: "billing_interval",
            type: "varchar",
            length: "20",
            default: "'MONTHLY'",
          },
          {
            name: "metadata",
            type: "jsonb",
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

    await queryRunner.createForeignKey(
      "payment_orders",
      new TableForeignKey({
        columnNames: ["organization_id"],
        referencedTableName: "organizations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "payment_orders",
      new TableForeignKey({
        columnNames: ["plan_id"],
        referencedTableName: "plans",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createIndex(
      "payment_orders",
      new TableIndex({
        name: "idx_payment_orders_razorpay_order_id",
        columnNames: ["razorpay_order_id"],
      }),
    );

    await queryRunner.createIndex(
      "payment_orders",
      new TableIndex({
        name: "idx_payment_orders_org_status",
        columnNames: ["organization_id", "status"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("payment_orders");
  }
}
