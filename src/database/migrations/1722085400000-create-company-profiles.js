export class CreateCompanyProfiles1722085400000 {
  name = "CreateCompanyProfiles1722085400000";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE company_profiles (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        organization_id uuid NOT NULL UNIQUE,

        company_name varchar(255) NOT NULL,

        logo text,

        website varchar(255),

        description text,

        created_at timestamp DEFAULT NOW(),

        updated_at timestamp DEFAULT NOW(),

        CONSTRAINT fk_company_profiles_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP TABLE company_profiles
    `);
  }
}
