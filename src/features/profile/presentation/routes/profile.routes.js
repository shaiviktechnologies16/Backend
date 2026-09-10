import { Router } from "express";
import { validate } from "../../../../common/middleware/validate.middleware.js";
import { uploadSingleFile } from "../../../upload/presentation/middleware/upload.middleware.js";
import { updateProfileSchema } from "../validators/profile.validator.js";

export default function createProfileRoutes({
  profileController,
  authMiddleware,
}) {
  const router = Router();

  router.get("/", authMiddleware, profileController.getProfile);

  router.patch(
    "/",
    authMiddleware,
    validate(updateProfileSchema),
    profileController.updateProfile,
  );

  router.patch(
    "/photo",
    authMiddleware,
    uploadSingleFile,
    profileController.updateProfilePhoto,
  );

  return router;
}
