import { UploadPurpose } from "../constants/upload-purpose.js";
import { UploadRules } from "../constants/upload-rules.js";
import {
  detectDangerousDoubleExtension,
  validateUploadedFileMimeType,
} from "../../../../common/middleware/file-upload-guard.middleware.js";

import { validateUrlForSsrfPrevention } from "../../../../common/utils/ssrf-guard.util.js";

export class UploadValidator {
  validateFile(file) {
    if (!file) {
      throw new Error("UPLOAD_FILE_REQUIRED");
    }

    if (!validateUploadedFileMimeType(file.mimetype)) {
      throw new Error("UNSUPPORTED_FILE_TYPE");
    }

    if (detectDangerousDoubleExtension(file.originalname)) {
      throw new Error("DANGEROUS_FILE_EXTENSION_DETECTED");
    }

    if (file.size > UploadRules.maxFileSize) {
      throw new Error("FILE_SIZE_LIMIT_EXCEEDED");
    }
  }

  validatePurpose(purpose) {
    if (!Object.values(UploadPurpose).includes(purpose)) {
      throw new Error("INVALID_UPLOAD_PURPOSE");
    }
  }

  validateContext({ purpose, organizationId = null, projectId = null }) {
    if (
      purpose === UploadPurpose.PLATFORM_LOGO &&
      (organizationId || projectId)
    ) {
      throw new Error("INVALID_PLATFORM_UPLOAD_CONTEXT");
    }

    if (
      purpose === UploadPurpose.PROFILE_PHOTO &&
      (organizationId || projectId)
    ) {
      throw new Error("INVALID_PROFILE_PHOTO_CONTEXT");
    }

    if (purpose === UploadPurpose.ORGANIZATION_LOGO && !organizationId) {
      throw new Error("ORGANIZATION_ID_REQUIRED");
    }

    if (purpose === UploadPurpose.KNOWLEDGE_FILE && !projectId) {
      throw new Error("PROJECT_ID_REQUIRED");
    }
  }

  async validateLink(sourceUrl) {
    if (!sourceUrl) {
      throw new Error("UPLOAD_SOURCE_URL_REQUIRED");
    }

    await validateUrlForSsrfPrevention(sourceUrl);
  }
}
