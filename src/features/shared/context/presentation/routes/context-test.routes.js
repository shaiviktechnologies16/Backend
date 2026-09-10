import { Router } from "express";

export function createContextTestRoutes({ middlewares }) {
  const router = Router();

  router.get("/", middlewares.workspaceContextMiddleware, (req, res) => {
    res.json({
      success: true,
      context: req.context,
    });
  });

  return router;
}
