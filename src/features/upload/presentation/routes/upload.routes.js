import express from "express";
import { validate } from "../../../../common/middleware/validate.middleware.js";
import { uploadSingleFile } from "../middleware/upload.middleware.js";
import { requireUploadPermission } from "../middleware/upload-access.middleware.js";
import { uploadSchema } from "../validators/upload.validator.js";

export default function createUploadRoutes({
  uploadController,
  workspaceContextMiddleware,
  getUserPermissionsUseCase,
  workspaceMemberPermissionRepository,
  organizationMemberRepository,
  rbacRepository,
}) {
  const router = express.Router({ mergeParams: true });

  router.post(
    "/",
    workspaceContextMiddleware,
    requireUploadPermission({
      getUserPermissionsUseCase,
      workspaceMemberPermissionRepository,
      organizationMemberRepository,
      rbacRepository,
    }),
    uploadSingleFile,
    validate(uploadSchema),
    uploadController.upload,
  );

  return router;
}
