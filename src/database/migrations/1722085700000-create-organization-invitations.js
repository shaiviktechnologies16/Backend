import { v4 as uuid } from "uuid";

export class CreateOrganizationInvitations1722085400000 {
  name = "CreateOrganizationInvitations1722085400000";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE organization_invitations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        organization_id UUID NOT NULL,

        email VARCHAR(255) NOT NULL,

        role VARCHAR(50) NOT NULL,

        token VARCHAR(255) NOT NULL UNIQUE,

        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',

        expires_at TIMESTAMP NOT NULL,

        accepted_at TIMESTAMP NULL,

        created_by UUID NULL,

        created_at TIMESTAMP DEFAULT NOW(),

        updated_at TIMESTAMP DEFAULT NOW(),

        CONSTRAINT fk_organization_invitations_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_organization_invitations_email
      ON organization_invitations(email);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_organization_invitations_org
      ON organization_invitations(organization_id);
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP TABLE organization_invitations;
    `);
  }
}
