import { AppError } from "../../../../common/errors/AppError.js";

export class GetProjectTrackingConfigUseCase {
  constructor({ projectAnalyticsRepository, projectRepository }) {
    this.projectAnalyticsRepository = projectAnalyticsRepository;
    this.projectRepository = projectRepository;
  }

  async execute({ projectId, organizationId }) {
    if (!projectId) {
      throw new AppError("Project ID is required.", 400, "PROJECT_ID_REQUIRED");
    }

    let config =
      await this.projectAnalyticsRepository.findConfigByProjectId(projectId);

    if (!config) {
      // Auto-provision config if not exists
      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new AppError("Project not found.", 404, "PROJECT_NOT_FOUND");
      }

      config = await this.projectAnalyticsRepository.createConfig({
        projectId,
        organizationId: organizationId || project.organizationId,
      });
    }

    const host =
      process.env.FRONTEND_URL || "https://admin.shaiviktechnologies.in";
    const apiHost =
      process.env.BACKEND_PUBLIC_URL ||
      process.env.BACKEND_URL ||
      "https://shaivik-ai.onrender.com";

    const snippet = `<script
  defer
  src="${host}/analytics.js"
  data-project-id="${config.trackingKey}"
  data-api-url="${apiHost}"
></script>`;

    return {
      ...config,
      snippet,
      scriptUrl: `${host}/analytics.js`,
      apiUrl: apiHost,
    };
  }
}
