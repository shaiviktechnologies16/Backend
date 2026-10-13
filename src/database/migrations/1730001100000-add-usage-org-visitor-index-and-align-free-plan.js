export class AddUsageOrgVisitorIndexAndAlignFreePlan1730001100000 {
  name = "AddUsageOrgVisitorIndexAndAlignFreePlan1730001100000";

  async up(queryRunner) {
    const hasUsage = await queryRunner.hasTable("usage");

    if (hasUsage) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_usage_org_visitor_created
        ON usage(organization_id, visitor_id, created_at);
      `);
    }

    const hasPlanLimits = await queryRunner.hasTable("plan_usage_limits");
    if (hasPlanLimits) {
      await queryRunner.query(`
        UPDATE plan_usage_limits pul
        SET requests_per_day = 100, requests_per_month = 3000
        FROM plans p
        WHERE pul.plan_id = p.id
          AND p.slug = 'free'
          AND pul.requests_per_day = 10;
      `);
    }
  }

  async down(queryRunner) {
    const hasUsage = await queryRunner.hasTable("usage");
    if (hasUsage) {
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_usage_org_visitor_created;
      `);
    }

    const hasPlanLimits = await queryRunner.hasTable("plan_usage_limits");
    if (hasPlanLimits) {
      await queryRunner.query(`
        UPDATE plan_usage_limits pul
        SET requests_per_day = 10, requests_per_month = 200
        FROM plans p
        WHERE pul.plan_id = p.id
          AND p.slug = 'free'
          AND pul.requests_per_day = 100;
      `);
    }
  }
}

