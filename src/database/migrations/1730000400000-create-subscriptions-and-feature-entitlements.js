import { Table, TableColumn, TableForeignKey } from "typeorm";

export class CreateSubscriptionsAndFeatureEntitlements1730000400000 {
  async up(queryRunner) {
    // 1. Extend `plans` table
    await queryRunner.addColumns("plans", [
      new TableColumn({
        name: "slug",
        type: "varchar",
        length: "100",
        isNullable: true,
      }),
      new TableColumn({
        name: "price_monthly",
        type: "numeric",
        precision: 10,
        scale: 2,
        default: 0,
      }),
      new TableColumn({
        name: "price_yearly",
        type: "numeric",
        precision: 10,
        scale: 2,
        default: 0,
      }),
      new TableColumn({
        name: "currency",
        type: "varchar",
        length: "10",
        default: "'USD'",
      }),
      new TableColumn({
        name: "display_order",
        type: "int",
        default: 0,
      }),
      new TableColumn({
        name: "is_public",
        type: "boolean",
        default: true,
      }),
      new TableColumn({
        name: "is_default",
        type: "boolean",
        default: false,
      }),
      new TableColumn({
        name: "is_archived",
        type: "boolean",
        default: false,
      }),
      new TableColumn({
        name: "trial_enabled",
        type: "boolean",
        default: false,
      }),
      new TableColumn({
        name: "trial_days",
        type: "int",
        default: 0,
      }),
    ]);

    // 2. Create `plan_features` table
    await queryRunner.createTable(
      new Table({
        name: "plan_features",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "plan_id",
            type: "uuid",
          },
          {
            name: "feature_key",
            type: "varchar",
            length: "100",
          },
          {
            name: "is_enabled",
            type: "boolean",
            default: true,
          },
          {
            name: "config",
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
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
        foreignKeys: [
          {
            columnNames: ["plan_id"],
            referencedTableName: "plans",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
      }),
      true,
    );

    // 3. Extend `plan_usage_limits` table
    await queryRunner.addColumns("plan_usage_limits", [
      new TableColumn({
        name: "max_projects",
        type: "int",
        isNullable: true,
      }),
      new TableColumn({
        name: "max_agents",
        type: "int",
        isNullable: true,
      }),
      new TableColumn({
        name: "max_knowledge_bases",
        type: "int",
        isNullable: true,
      }),
      new TableColumn({
        name: "max_knowledge_documents",
        type: "int",
        isNullable: true,
      }),
      new TableColumn({
        name: "monthly_ai_credits",
        type: "int",
        isNullable: true,
      }),
      new TableColumn({
        name: "max_team_members",
        type: "int",
        isNullable: true,
      }),
      new TableColumn({
        name: "max_whatsapp_connections",
        type: "int",
        isNullable: true,
      }),
      new TableColumn({
        name: "voice_ai_minutes",
        type: "int",
        isNullable: true,
      }),
    ]);

    // 4. Create `subscriptions` table
    await queryRunner.createTable(
      new Table({
        name: "subscriptions",
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
            isUnique: true,
          },
          {
            name: "plan_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "status",
            type: "varchar",
            length: "50",
            default: "'ACTIVE'",
          },
          {
            name: "billing_interval",
            type: "varchar",
            length: "20",
            default: "'MONTHLY'",
          },
          {
            name: "current_period_start",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "current_period_end",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "trial_ends_at",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "canceled_at",
            type: "timestamp",
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
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
        foreignKeys: [
          {
            columnNames: ["organization_id"],
            referencedTableName: "organizations",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
          {
            columnNames: ["plan_id"],
            referencedTableName: "plans",
            referencedColumnNames: ["id"],
            onDelete: "SET NULL",
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("subscriptions");
    await queryRunner.dropTable("plan_features");
  }
}
