import { v4 as uuid } from "uuid";

export class SeedPermissions1722085300000 {
  name = "SeedPermissions1722085300000";

  async up(queryRunner) {
    const permissions = [
      {
        module: "dashboard",
        key: "dashboard.view",
        description: "View dashboard",
      },

      {
        module: "users",
        key: "users.view",
        description: "View users",
      },
      {
        module: "users",
        key: "users.create",
        description: "Create users",
      },
      {
        module: "users",
        key: "users.update",
        description: "Update users",
      },
      {
        module: "users",
        key: "users.delete",
        description: "Delete users",
      },

      {
        module: "organizations",
        key: "organizations.view",
        description: "View organizations",
      },
      {
        module: "organizations",
        key: "organizations.create",
        description: "Create organizations",
      },
      {
        module: "organizations",
        key: "organizations.update",
        description: "Update organizations",
      },
      {
        module: "organizations",
        key: "organizations.delete",
        description: "Delete organizations",
      },

      {
        module: "agents",
        key: "agents.view",
        description: "View agents",
      },
      {
        module: "agents",
        key: "agents.create",
        description: "Create agents",
      },
      {
        module: "agents",
        key: "agents.update",
        description: "Update agents",
      },
      {
        module: "agents",
        key: "agents.delete",
        description: "Delete agents",
      },

      {
        module: "projects",
        key: "projects.view",
        description: "View projects",
      },
      {
        module: "projects",
        key: "projects.create",
        description: "Create projects",
      },
      {
        module: "projects",
        key: "projects.update",
        description: "Update projects",
      },
      {
        module: "projects",
        key: "projects.delete",
        description: "Delete projects",
      },

      {
        module: "roles",
        key: "roles.view",
        description: "View roles",
      },
      {
        module: "roles",
        key: "roles.create",
        description: "Create roles",
      },
      {
        module: "roles",
        key: "roles.update",
        description: "Update roles",
      },
      {
        module: "roles",
        key: "roles.delete",
        description: "Delete roles",
      },

      {
        module: "settings",
        key: "settings.manage",
        description: "Manage platform settings",
      },

      {
        module: "analytics",
        key: "analytics.view",
        description: "View analytics",
      },

      {
        module: "api_keys",
        key: "api_keys.manage",
        description: "Manage API keys",
      },

      {
        module: "tts",
        key: "tts.manage",
        description: "Manage platform TTS configuration",
      },

      {
        module: "admins",
        key: "admins.manage",
        description: "Manage administrators",
      },
    ];

    for (const permission of permissions) {
      await queryRunner.query(
        `
        INSERT INTO permissions
        (
          id,
          module,
          permission_key,
          description,
          created_at
        )
        VALUES
        ($1, $2, $3, $4, NOW())
        ON CONFLICT(permission_key)
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
        'dashboard.view',

        'users.view',
        'users.create',
        'users.update',
        'users.delete',

        'organizations.view',
        'organizations.create',
        'organizations.update',
        'organizations.delete',

        'agents.view',
        'agents.create',
        'agents.update',
        'agents.delete',

        'projects.view',
        'projects.create',
        'projects.update',
        'projects.delete',

        'roles.view',
        'roles.create',
        'roles.update',
        'roles.delete',

        'settings.manage',
        'analytics.view',
        'api_keys.manage',
        'tts.manage',
        'admins.manage'
      )
      `,
    );
  }
}
