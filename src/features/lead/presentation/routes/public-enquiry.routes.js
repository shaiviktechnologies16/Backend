import { Router } from "express";

export const createPublicEnquiryRoutes = ({ publicEnquiryController }) => {
  const router = Router();

  router.post("/", publicEnquiryController.create);

  return router;
};
