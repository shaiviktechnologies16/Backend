import { Router } from "express";

export default function createRbacRoutes(rbacController, authMiddleware) {
  const router = Router();

  router.get(
    "/permissions",
    authMiddleware,
    rbacController.getAllPermissions,
  );

  return router;
}
