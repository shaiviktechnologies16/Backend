import multer from "multer";
import {
  detectDangerousDoubleExtension,
  sanitizeUploadedFilename,
} from "../../../../common/middleware/file-upload-guard.middleware.js";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_EXTENSIONS = Object.freeze(["jpg", "jpeg", "png", "webp"]);

const memoryStorage = multer.memoryStorage();

const multerCharacterUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (!file) {
      return cb(null, true);
    }

    const mime = (file.mimetype || "").toLowerCase().trim();
    const ext = (file.originalname || "").toLowerCase().split(".").pop();

    if (!ALLOWED_MIME_TYPES.includes(mime) || !ALLOWED_EXTENSIONS.includes(ext)) {
      const err = new Error(
        "Unsupported image type. Only JPEG, PNG, and WebP images are allowed.",
      );
      err.code = "UNSUPPORTED_IMAGE_TYPE";
      return cb(err, false);
    }

    if (detectDangerousDoubleExtension(file.originalname)) {
      const err = new Error("Dangerous file extension detected.");
      err.code = "DANGEROUS_FILE_EXTENSION_DETECTED";
      return cb(err, false);
    }

    file.originalname = sanitizeUploadedFilename(file.originalname);
    return cb(null, true);
  },
}).single("file");

export const uploadCharacterReferenceMiddleware = (req, res, next) => {
  multerCharacterUpload(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: {
            code: "FILE_SIZE_LIMIT_EXCEEDED",
            message: "File size exceeds 10MB limit.",
          },
        });
      }

      if (
        err.code === "UNSUPPORTED_IMAGE_TYPE" ||
        err.code === "DANGEROUS_FILE_EXTENSION_DETECTED"
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: "FILE_UPLOAD_ERROR",
          message: err.message || "File upload validation failed.",
        },
      });
    }

    next();
  });
};
