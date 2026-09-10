import { ProjectContextEntity } from "../../domain/entities/project-context.entity.js";

export function projectContextMiddleware({ resolveProjectContextUseCase }) {
  return async (req, res, next) => {
    try {
      const projectId = req.headers["x-project-id"] || req.params.projectId;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project context required.",
        });
      }

      const project = await resolveProjectContextUseCase.execute(
        req.context.user.id,
        projectId,
      );

      req.context.project = new ProjectContextEntity({
        id: project.id,
        name: project.name,
        status: project.status,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}
