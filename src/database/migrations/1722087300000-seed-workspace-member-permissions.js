import { v4 as uuid } from "uuid";

export class SeedWorkspaceMemberPermissions1722087300000 {
  name = "SeedWorkspaceMemberPermissions1722087300000";

  async up(queryRunner) {
    const permissions = [
      {
        module: "members",
        key: "members.view",
        description: "View workspace members",
      },
      {
        module: "members",
        key: "members.manage",
        description: "Manage workspace members",
      },
    ];

    for (const permission of permissions) {
      await queryRunner.query(
        `
          INSERT INTO permissions (
            id,
            module,
            permission_key,
            description
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (permission_key)
          DO NOTHING
        `,
        [uuid(), permission.module, permission.key, permission.description],
      );
    }
  }

  async down(queryRunner) {
    await queryRunner.query(
      `
        DELETE FROM permissions
        WHERE permission_key IN (
          'members.view',
          'members.manage'
        )
      `,
    );
  }
}
