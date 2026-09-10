export class OrganizationInvitationPermissionRepositoryImpl {
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

  async replacePermissions(invitationId, permissionIds, manager = null) {
    const db = manager ?? this.dataSource;

    await db.query(
      `
        DELETE FROM organization_invitation_permissions
        WHERE organization_invitation_id = $1
      `,
      [invitationId],
    );

    if (!permissionIds.length) {
      return;
    }

    const values = [];
    const placeholders = [];

    permissionIds.forEach((permissionId, index) => {
      const base = index * 2;

      values.push(invitationId, permissionId);
      placeholders.push(`($${base + 1}, $${base + 2})`);
    });

    await db.query(
      `
        INSERT INTO organization_invitation_permissions
        (
          organization_invitation_id,
          permission_id
        )
        VALUES ${placeholders.join(", ")}
        ON CONFLICT (
          organization_invitation_id,
          permission_id
        )
        DO NOTHING
      `,
      values,
    );
  }

  async getPermissions(invitationId, manager = null) {
    const db = manager ?? this.dataSource;

    return db.query(
      `
        SELECT
          p.id,
          p.permission_key AS "permissionKey",
          p.module,
          p.description
        FROM organization_invitation_permissions oip
        INNER JOIN permissions p
          ON p.id = oip.permission_id
        WHERE oip.organization_invitation_id = $1
        ORDER BY p.permission_key
      `,
      [invitationId],
    );
  }
}
