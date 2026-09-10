import multer from "multer";
import { UploadRules } from "../../domain/constants/upload-rules.js";
import {
  createMulterFileUploadFilter,
  fileUploadGuardMiddleware,
} from "../../../../common/middleware/file-upload-guard.middleware.js";

const memoryStorageInstance = multer.memoryStorage();

const multerSingleFileParser = multer({
  storage: memoryStorageInstance,
  limits: {
    fileSize: UploadRules.maxFileSize,
  },
  fileFilter: createMulterFileUploadFilter(),
}).single("file");

export const uploadSingleFile = (request, response, next) => {
  multerSingleFileParser(request, response, async (multerParseError) => {
    if (multerParseError) {
      if (multerParseError.code === "LIMIT_FILE_SIZE") {
        return response.status(400).json({
          success: false,
          error: {
            code: "FILE_SIZE_LIMIT_EXCEEDED",
            message:
              "Uploaded file size exceeds maximum allowed limit of 5 MB.",
          },
        });
      }

      if (
        multerParseError.code === "UNSUPPORTED_FILE_TYPE" ||
        multerParseError.code === "DANGEROUS_FILE_EXTENSION_DETECTED"
      ) {
        return response.status(400).json({
          success: false,
          error: {
            code: multerParseError.code,
            message: multerParseError.message,
          },
        });
      }

      return response.status(400).json({
        success: false,
        error: {
          code: "FILE_UPLOAD_ERROR",
          message: multerParseError.message || "File upload validation failed.",
        },
      });
    }

    await fileUploadGuardMiddleware(request, response, next);
  });
};
