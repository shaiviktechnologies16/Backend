export class ExpandCompanyProfileLanguage1730000350000 {
  name = "ExpandCompanyProfileLanguage1730000350000";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE company_profiles
      ALTER COLUMN language TYPE varchar(100)
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE company_profiles
      ALTER COLUMN language TYPE varchar(20)
    `);
  }
}
