import { v4 as uuid } from "uuid";

export class CreateOrganizationInvitationPermissions1723000100000 {
  name = "CreateOrganizationInvitationPermissions1723000100000";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE organization_invitation_permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_invitation_id UUID NOT NULL,
        permission_id UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),

        CONSTRAINT fk_invitation_permissions_invitation
          FOREIGN KEY (organization_invitation_id)
          REFERENCES organization_invitations(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_invitation_permissions_permission
          FOREIGN KEY (permission_id)
          REFERENCES permissions(id)
          ON DELETE CASCADE,

        CONSTRAINT uq_invitation_permissions
          UNIQUE (
            organization_invitation_id,
            permission_id
          )
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP TABLE IF EXISTS organization_invitation_permissions
    `);
  }
}
