import { Router } from "express";

export const createPublicProjectRequestRoutes = ({
  publicProjectRequestController,
}) => {
  const router = Router();

  router.post("/", publicProjectRequestController.submit);

  return router;
};

