export class ExpandCompanyProfiles1730000340000 {
  name = "ExpandCompanyProfiles1730000340000";

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE company_profiles
        ADD COLUMN cover_image text,
        ADD COLUMN tagline varchar(255),

        ADD COLUMN email varchar(255),
        ADD COLUMN phone varchar(50),
        ADD COLUMN alternate_phone varchar(50),

        ADD COLUMN street varchar(255),
        ADD COLUMN area varchar(255),
        ADD COLUMN city varchar(100),
        ADD COLUMN state varchar(100),
        ADD COLUMN country varchar(100),
        ADD COLUMN postal_code varchar(20),

        ADD COLUMN industry varchar(150),
        ADD COLUMN company_size varchar(50),
        ADD COLUMN founded_year integer,
        ADD COLUMN business_type varchar(100),
        ADD COLUMN timezone varchar(100),
        ADD COLUMN currency varchar(10),
        ADD COLUMN language varchar(20),

        ADD COLUMN linkedin varchar(500),
        ADD COLUMN twitter varchar(500),
        ADD COLUMN instagram varchar(500),
        ADD COLUMN facebook varchar(500),
        ADD COLUMN youtube varchar(500),

        ADD COLUMN primary_color varchar(20),
        ADD COLUMN secondary_color varchar(20),
        ADD COLUMN accent_color varchar(20)
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE company_profiles
        DROP COLUMN cover_image,
        DROP COLUMN tagline,

        DROP COLUMN email,
        DROP COLUMN phone,
        DROP COLUMN alternate_phone,

        DROP COLUMN street,
        DROP COLUMN area,
        DROP COLUMN city,
        DROP COLUMN state,
        DROP COLUMN country,
        DROP COLUMN postal_code,

        DROP COLUMN industry,
        DROP COLUMN company_size,
        DROP COLUMN founded_year,
        DROP COLUMN business_type,
        DROP COLUMN timezone,
        DROP COLUMN currency,
        DROP COLUMN language,

        DROP COLUMN linkedin,
        DROP COLUMN twitter,
        DROP COLUMN instagram,
        DROP COLUMN facebook,
        DROP COLUMN youtube,

        DROP COLUMN primary_color,
        DROP COLUMN secondary_color,
        DROP COLUMN accent_color
    `);
  }
}
