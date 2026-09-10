export class WorkspaceDashboardDto {
  constructor(dashboard) {
    this.success = true;
    this.message = "Workspace dashboard retrieved successfully.";
    this.data = dashboard.toJSON();
  }
}
