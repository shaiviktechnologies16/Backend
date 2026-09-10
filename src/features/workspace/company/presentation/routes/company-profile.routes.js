import { Router } from "express";
import { updateCompanyProfileValidator } from "../validators/company-profile.validator.js";

export function createCompanyProfileRoutes({
  companyProfileController,
  middleware,
}) {
  const router = Router();

  router.get("/", ...middleware, companyProfileController.get);

  router.put(
    "/",
    ...middleware,
    updateCompanyProfileValidator,
    companyProfileController.update,
  );

  return router;
}
