import { TableColumn } from "typeorm";

export class AddStatusToOrganizationMembers1722086300000 {
  async up(queryRunner) {
    await queryRunner.addColumn(
      "organization_members",
      new TableColumn({
        name: "status",
        type: "varchar",
        length: "20",
        default: "'ACTIVE'",
      }),
    );

    await queryRunner.addColumn(
      "organization_members",
      new TableColumn({
        name: "removed_at",
        type: "timestamp",
        isNullable: true,
      }),
    );
  }

  async down(queryRunner) {
    await queryRunner.dropColumn("organization_members", "removed_at");

    await queryRunner.dropColumn("organization_members", "status");
  }
}
