import { Table, TableForeignKey } from "typeorm";

export class CreateProjectWorkspaceTable1722086600000 {
  name = "CreateProjectWorkspaceTable1722086600000";

  async up(queryRunner) {
    await queryRunner.createTable(
      new Table({
        name: "projects",
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
            length: "255",
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "status",
            type: "varchar",
            length: "50",
            default: "'ACTIVE'",
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
          {
            name: "deleted_at",
            type: "timestamp",
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys("projects", [
      new TableForeignKey({
        columnNames: ["organization_id"],
        referencedTableName: "organizations",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
      new TableForeignKey({
        columnNames: ["created_by"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    ]);

    const hasAgents = await queryRunner.hasTable("agents");
    if (hasAgents) {
      const hasProjectId = await queryRunner.hasColumn("agents", "project_id");
      if (hasProjectId) {
        await queryRunner.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'fk_agents_project'
            ) THEN
              ALTER TABLE agents
              ADD CONSTRAINT fk_agents_project
              FOREIGN KEY (project_id)
              REFERENCES projects(id)
              ON DELETE CASCADE;
            END IF;
          END $$;
        `);
      }
    }
  }

  async down(queryRunner) {
    const hasAgents = await queryRunner.hasTable("agents");
    if (hasAgents) {
      await queryRunner.query(`
        ALTER TABLE agents
        DROP CONSTRAINT IF EXISTS fk_agents_project
      `);
    }
    await queryRunner.dropTable("projects");
  }
}
