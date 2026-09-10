import { TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class AddCredentialToAgentTools1722087700000 {
  name = "AddCredentialToAgentTools1722087700000";

  async up(queryRunner) {
    await queryRunner.addColumn(
      "agent_tools",
      new TableColumn({
        name: "credential_id",
        type: "uuid",
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      "agent_tools",
      new TableForeignKey({
        name: "fk_agent_tools_credential",
        columnNames: ["credential_id"],
        referencedTableName: "workspace_api_keys",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );

    await queryRunner.createIndex(
      "agent_tools",
      new TableIndex({
        name: "idx_agent_tools_credential_id",
        columnNames: ["credential_id"],
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropIndex("agent_tools", "idx_agent_tools_credential_id");

    await queryRunner.dropForeignKey(
      "agent_tools",
      "fk_agent_tools_credential",
    );

    await queryRunner.dropColumn("agent_tools", "credential_id");
  }
}
