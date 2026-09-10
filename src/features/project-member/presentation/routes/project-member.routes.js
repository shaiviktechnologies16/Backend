import { Router } from "express";

export default function createProjectMemberRoutes(controller) {
  const router = Router();
  router.post("/projects/:projectId/members", controller.add);
  router.get("/projects/:projectId/members", controller.getAll);
  router.patch("/projects/:projectId/members/:memberId", controller.updateRole);
  router.put(
    "/projects/:projectId/members/:memberId/restore",
    controller.restore,
  );
  router.delete("/projects/:projectId/members/:memberId", controller.remove);
  return router;
}
