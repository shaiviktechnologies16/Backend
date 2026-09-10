export class RenameProjectsToAgents1722084900000 {
  name = "RenameProjectsToAgents1722084900000";

  async up(queryRunner) {
    const projectsTable = await queryRunner.getTable("projects");
    const agentsTable = await queryRunner.getTable("agents");

    if (projectsTable && !agentsTable) {
      await queryRunner.renameTable("projects", "agents");
    }
  }

  async down(queryRunner) {
    const projectsTable = await queryRunner.getTable("projects");
    const agentsTable = await queryRunner.getTable("agents");

    if (agentsTable && !projectsTable) {
      await queryRunner.renameTable("agents", "projects");
    }
  }
}
