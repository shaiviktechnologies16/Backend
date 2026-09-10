import { v4 as uuid } from "uuid";

export class CreateOrganizationMemberPermissions1723000000000 {
  name = "CreateOrganizationMemberPermissions1723000000000";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE organization_member_permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_member_id UUID NOT NULL,
        permission_id UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),

        CONSTRAINT fk_organization_member_permissions_member
          FOREIGN KEY (organization_member_id)
          REFERENCES organization_members(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_organization_member_permissions_permission
          FOREIGN KEY (permission_id)
          REFERENCES permissions(id)
          ON DELETE CASCADE,

        CONSTRAINT uq_organization_member_permissions
          UNIQUE (organization_member_id, permission_id)
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DROP TABLE IF EXISTS organization_member_permissions
    `);
  }
}
