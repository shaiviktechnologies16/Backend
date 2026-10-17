import {
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreateProjectVisitorAnalytics1730001200000 {
  name = "CreateProjectVisitorAnalytics1730001200000";

  async up(queryRunner) {
    // 1. Table: project_analytics_configs
    await queryRunner.createTable(
      new Table({
        name: "project_analytics_configs",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "project_id",
            type: "uuid",
            isNullable: false,
            isUnique: true,
          },
          {
            name: "organization_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "tracking_key",
            type: "varchar",
            length: "64",
            isNullable: false,
            isUnique: true,
          },
          {
            name: "is_enabled",
            type: "boolean",
            default: true,
          },
          {
            name: "allowed_domains",
            type: "text",
            isArray: true,
            default: "'{}'",
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
      "project_analytics_configs",
      new TableForeignKey({
        name: "fk_project_analytics_config_project",
        columnNames: ["project_id"],
        referencedTableName: "projects",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "project_analytics_configs",
      new TableForeignKey({
        name: "fk_project_analytics_config_org",
        columnNames: ["organization_id"],
        referencedTableName: "organizations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createIndex(
      "project_analytics_configs",
      new TableIndex({
        name: "idx_project_analytics_config_tracking_key",
        columnNames: ["tracking_key"],
      }),
    );

    // 2. Table: project_visitor_events
    await queryRunner.createTable(
      new Table({
        name: "project_visitor_events",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "project_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "organization_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "event_type",
            type: "varchar",
            length: "32",
            default: "'pageview'",
          },
          {
            name: "visitor_id",
            type: "varchar",
            length: "128",
            isNullable: false,
          },
          {
            name: "session_id",
            type: "varchar",
            length: "128",
            isNullable: false,
          },
          {
            name: "page_path",
            type: "varchar",
            length: "1024",
            isNullable: false,
          },
          {
            name: "page_title",
            type: "varchar",
            length: "512",
            isNullable: true,
          },
          {
            name: "referrer",
            type: "varchar",
            length: "1024",
            isNullable: true,
          },
          {
            name: "referrer_source",
            type: "varchar",
            length: "128",
            isNullable: true,
          },
          {
            name: "device_category",
            type: "varchar",
            length: "32",
            isNullable: true,
          },
          {
            name: "browser",
            type: "varchar",
            length: "64",
            isNullable: true,
          },
          {
            name: "os",
            type: "varchar",
            length: "64",
            isNullable: true,
          },
          {
            name: "country",
            type: "varchar",
            length: "64",
            isNullable: true,
          },
          {
            name: "duration_seconds",
            type: "int",
            default: 0,
          },
          {
            name: "is_new_visitor",
            type: "boolean",
            default: false,
          },
          {
            name: "metadata",
            type: "jsonb",
            default: "'{}'::jsonb",
          },
          {
            name: "created_at",
            type: "timestamp with time zone",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "project_visitor_events",
      new TableForeignKey({
        name: "fk_project_visitor_events_project",
        columnNames: ["project_id"],
        referencedTableName: "projects",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "project_visitor_events",
      new TableForeignKey({
        name: "fk_project_visitor_events_org",
        columnNames: ["organization_id"],
        referencedTableName: "organizations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createIndex(
      "project_visitor_events",
      new TableIndex({
        name: "idx_pve_project_created_at",
        columnNames: ["project_id", "created_at"],
      }),
    );

    await queryRunner.createIndex(
      "project_visitor_events",
      new TableIndex({
        name: "idx_pve_project_visitor",
        columnNames: ["project_id", "visitor_id"],
      }),
    );

    await queryRunner.createIndex(
      "project_visitor_events",
      new TableIndex({
        name: "idx_pve_project_session",
        columnNames: ["project_id", "session_id"],
      }),
    );

    await queryRunner.createIndex(
      "project_visitor_events",
      new TableIndex({
        name: "idx_pve_project_path",
        columnNames: ["project_id", "page_path"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropTable("project_visitor_events", true);
    await queryRunner.dropTable("project_analytics_configs", true);
  }
}

