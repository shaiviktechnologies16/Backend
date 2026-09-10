import { TableIndex } from "typeorm";

export class AddPerformanceIndexes1722085800000 {
  async up(queryRunner) {
    await queryRunner.createIndex(
      "organization_members",
      new TableIndex({
        name: "idx_org_members_user_id",
        columnNames: ["user_id"],
      }),
    );

    await queryRunner.createIndex(
      "agents",
      new TableIndex({
        name: "idx_agents_user_id",
        columnNames: ["user_id"],
      }),
    );

    await queryRunner.createIndex(
      "conversations",
      new TableIndex({
        name: "idx_conversations_agent_id",
        columnNames: ["agent_id"],
      }),
    );

    await queryRunner.createIndex(
      "conversations",
      new TableIndex({
        name: "idx_conversations_user_id",
        columnNames: ["user_id"],
      }),
    );

    await queryRunner.createIndex(
      "messages",
      new TableIndex({
        name: "idx_messages_conversation_id",
        columnNames: ["conversation_id"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropIndex(
      "organization_members",
      "idx_org_members_user_id",
    );

    await queryRunner.dropIndex("agents", "idx_agents_user_id");

    await queryRunner.dropIndex("conversations", "idx_conversations_agent_id");

    await queryRunner.dropIndex("conversations", "idx_conversations_user_id");

    await queryRunner.dropIndex("messages", "idx_messages_conversation_id");
  }
}
