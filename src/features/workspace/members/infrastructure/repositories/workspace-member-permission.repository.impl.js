export class WorkspaceMemberPermissionRepositoryImpl {
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

  async replacePermissions(
    organizationMemberId,
    permissionIds,
    manager = null,
  ) {
    const db = manager ?? this.dataSource;

    await db.query(
      `
        DELETE FROM organization_member_permissions
        WHERE organization_member_id = $1
      `,
      [organizationMemberId],
    );

    if (!permissionIds.length) {
      return;
    }

    const values = [];
    const placeholders = [];

    permissionIds.forEach((permissionId, index) => {
      const base = index * 2;

      values.push(organizationMemberId, permissionId);

      placeholders.push(`($${base + 1}, $${base + 2})`);
    });

    await db.query(
      `
        INSERT INTO organization_member_permissions
        (
          organization_member_id,
          permission_id
        )
        VALUES ${placeholders.join(", ")}
        ON CONFLICT (
          organization_member_id,
          permission_id
        )
        DO NOTHING
      `,
      values,
    );
  }

  async getPermissions(organizationMemberId, manager = null) {
    const db = manager ?? this.dataSource;

    return db.query(
      `
        SELECT
          p.id,
          p.permission_key AS "permissionKey",
          p.module,
          p.description
        FROM organization_member_permissions omp
        INNER JOIN permissions p
          ON p.id = omp.permission_id
        WHERE omp.organization_member_id = $1
        ORDER BY p.permission_key
      `,
      [organizationMemberId],
    );
  }
}
