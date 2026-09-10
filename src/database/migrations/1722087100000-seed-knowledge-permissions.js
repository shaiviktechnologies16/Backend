import { v4 as uuid } from "uuid";

export class SeedKnowledgePermissions1722087100000 {
  name = "SeedKnowledgePermissions1722087100000";

  async up(queryRunner) {
    const permissions = [
      {
        module: "knowledge",
        key: "knowledge.view",
        description: "View knowledge sources",
      },
      {
        module: "knowledge",
        key: "knowledge.create",
        description: "Create knowledge sources",
      },
      {
        module: "knowledge",
        key: "knowledge.update",
        description: "Update knowledge sources",
      },
      {
        module: "knowledge",
        key: "knowledge.delete",
        description: "Delete knowledge sources",
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
        ($1,$2,$3,$4,NOW())
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
        'knowledge.view',
        'knowledge.create',
        'knowledge.update',
        'knowledge.delete'
      )
      `,
    );
  }
}
