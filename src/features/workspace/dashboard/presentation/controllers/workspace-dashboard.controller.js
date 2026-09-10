import { WorkspaceDashboardDto } from "../../application/dto/workspace-dashboard.dto.js";

export class WorkspaceDashboardController {
  constructor({ getWorkspaceDashboardUseCase }) {
    this.getWorkspaceDashboardUseCase = getWorkspaceDashboardUseCase;
  }

  getDashboard = async (req, res, next) => {
    try {
      const dashboard = await this.getWorkspaceDashboardUseCase.execute({
        organizationId: req.context.organization.id,
      });

      res.status(200).json(new WorkspaceDashboardDto(dashboard));
    } catch (error) {
      next(error);
    }
  };
}
