import { v4 as uuid } from "uuid";

export class CreatePlatformApiKeys1723000110000 {
  name = "CreatePlatformApiKeys1723000110000";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE platform_api_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT NULL,
        encrypted_value TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_platform_api_keys_created_by
          FOREIGN KEY (created_by)
          REFERENCES users(id)
          ON DELETE RESTRICT,

        CONSTRAINT uq_platform_api_keys_provider_name
          UNIQUE (provider, name)
      );
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP TABLE IF EXISTS platform_api_keys;
    `);
  }
}
