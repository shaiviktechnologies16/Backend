export class AddCostAndModelToUsage1730000700000 {
  name = "AddCostAndModelToUsage1730000700000";

  async up(queryRunner) {
    const hasUsage = await queryRunner.hasTable("usage");

    if (hasUsage) {
      await queryRunner.query(`
        ALTER TABLE usage
        ADD COLUMN IF NOT EXISTS organization_id uuid,
        ADD COLUMN IF NOT EXISTS model_name varchar(100),
        ADD COLUMN IF NOT EXISTS cost_usd numeric(10, 6) DEFAULT 0;
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_usage_org_created
        ON usage(organization_id, created_at);
      `);
    }

    const hasSettings = await queryRunner.hasTable("workspace_settings");

    if (hasSettings) {
      await queryRunner.query(`
        ALTER TABLE workspace_settings
        ADD COLUMN IF NOT EXISTS daily_budget_usd numeric(10, 2),
        ADD COLUMN IF NOT EXISTS monthly_budget_usd numeric(10, 2);
      `);
    }
  }

  async down(queryRunner) {
    const hasSettings = await queryRunner.hasTable("workspace_settings");

    if (hasSettings) {
      await queryRunner.query(`
        ALTER TABLE workspace_settings
        DROP COLUMN IF EXISTS monthly_budget_usd,
        DROP COLUMN IF EXISTS daily_budget_usd;
      `);
    }

    const hasUsage = await queryRunner.hasTable("usage");

    if (hasUsage) {
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_usage_org_created;
      `);

      await queryRunner.query(`
        ALTER TABLE usage
        DROP COLUMN IF EXISTS cost_usd,
        DROP COLUMN IF EXISTS model_name,
        DROP COLUMN IF EXISTS organization_id;
      `);
    }
  }
}
