export class AddNetworkIdentityHashToUsage1730000800000 {
  name = "AddNetworkIdentityHashToUsage1730000800000";

  async up(queryRunner) {
    const hasUsage = await queryRunner.hasTable("usage");

    if (hasUsage) {
      await queryRunner.query(`
        ALTER TABLE usage
        ADD COLUMN IF NOT EXISTS network_identity_hash varchar(64);
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_usage_org_net_created
        ON usage(organization_id, network_identity_hash, created_at);
      `);
    }
  }

  async down(queryRunner) {
    const hasUsage = await queryRunner.hasTable("usage");

    if (hasUsage) {
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_usage_org_net_created;
      `);

      await queryRunner.query(`
        ALTER TABLE usage
        DROP COLUMN IF EXISTS network_identity_hash;
      `);
    }
  }
}
