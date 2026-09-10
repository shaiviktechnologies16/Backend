export class CreatePlatformConfigs1723000120000 {
  name = "CreatePlatformConfigs1723000120000";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE platform_configs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        config_key VARCHAR(100) NOT NULL,
        config_value TEXT NULL,
        is_secret BOOLEAN NOT NULL DEFAULT FALSE,
        description TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT uq_platform_configs_config_key
          UNIQUE (config_key)
      );
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP TABLE IF EXISTS platform_configs;
    `);
  }
}
