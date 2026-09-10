export class UpdateOrganizationSlugUniqueIndex1722084800000 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE organizations
      DROP CONSTRAINT IF EXISTS "UQ_963693341bd612aa01ddf3a4b68";
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_organizations_slug_active"
      ON organizations(slug)
      WHERE deleted_at IS NULL;
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_organizations_slug_active";
    `);

    await queryRunner.query(`
      ALTER TABLE organizations
      ADD CONSTRAINT "UQ_963693341bd612aa01ddf3a4b68"
      UNIQUE (slug);
    `);
  }
}
