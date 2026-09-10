export class CreateUploads1723000130000 {
  name = "CreateUploads1723000130000";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE uploads (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        purpose VARCHAR(50) NOT NULL,

        uploaded_by UUID NOT NULL,

        organization_id UUID NULL,
        project_id UUID NULL,

        original_name VARCHAR(255) NULL,
        mime_type VARCHAR(150) NULL,
        size BIGINT NULL,

        storage_provider VARCHAR(50) NULL,
        storage_key TEXT NULL,
        storage_url TEXT NULL,

        source_url TEXT NULL,

        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',

        metadata JSONB NULL,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_uploads_purpose
        ON uploads (purpose);

      CREATE INDEX idx_uploads_uploaded_by
        ON uploads (uploaded_by);

      CREATE INDEX idx_uploads_organization_id
        ON uploads (organization_id);

      CREATE INDEX idx_uploads_project_id
        ON uploads (project_id);

      CREATE INDEX idx_uploads_status
        ON uploads (status);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_uploads_status;
      DROP INDEX IF EXISTS idx_uploads_project_id;
      DROP INDEX IF EXISTS idx_uploads_organization_id;
      DROP INDEX IF EXISTS idx_uploads_uploaded_by;
      DROP INDEX IF EXISTS idx_uploads_purpose;

      DROP TABLE IF EXISTS uploads;
    `);
  }
}
