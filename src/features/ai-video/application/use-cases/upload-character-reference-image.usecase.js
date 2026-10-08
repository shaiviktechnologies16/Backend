import crypto from "crypto";
import { AppError } from "../../../../common/errors/AppError.js";
import { UploadPurpose } from "../../../upload/domain/constants/upload-purpose.js";
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

export class UploadCharacterReferenceImageUseCase {
  constructor({ storageProvider = null, uploadFileUseCase = null } = {}) {
    this.storageProvider = storageProvider;
    this.uploadFileUseCase = uploadFileUseCase;
  }

  async execute({ userId, organizationId, file }) {
    if (!organizationId) {
      throw new AppError(
        "Organization context is required.",
        400,
        "ORGANIZATION_CONTEXT_REQUIRED",
      );
    }

    if (!userId) {
      throw new AppError(
        "User authentication context is required.",
        401,
        "UNAUTHORIZED",
      );
    }

    if (!file || !file.buffer) {
      throw new AppError("Image file is required.", 400, "MISSING_IMAGE_FILE");
    }

    const fileSize = file.size || file.buffer.length;
    if (fileSize > MAX_IMAGE_SIZE_BYTES) {
      throw new AppError(
        "Image size exceeds the maximum limit of 10 MB.",
        400,
        "FILE_SIZE_LIMIT_EXCEEDED",
      );
    }

    const mimeType = (file.mimetype || "").toLowerCase().trim();
    const originalName = file.originalname || "reference.png";
    const extension = originalName.toLowerCase().split(".").pop();

    if (
      !ALLOWED_MIME_TYPES.includes(mimeType) ||
      !ALLOWED_EXTENSIONS.includes(extension)
    ) {
      throw new AppError(
        "Unsupported image type. Only JPEG, PNG, and WebP images are allowed.",
        400,
        "UNSUPPORTED_IMAGE_TYPE",
      );
    }

    if (detectDangerousDoubleExtension(originalName)) {
      throw new AppError(
        "Dangerous file extension detected.",
        400,
        "DANGEROUS_FILE_EXTENSION_DETECTED",
      );
    }

    // Never trust original filename: generate unique storage filename
    const uniqueId = crypto.randomUUID();
    const generatedFilename = `character-reference-${organizationId}-${uniqueId}.${extension}`;

    let storedUrl = null;
    let storageKey = null;

    if (this.uploadFileUseCase) {
      try {
        const uploadRecord = await this.uploadFileUseCase.execute({
          userId,
          organizationId,
          purpose: UploadPurpose.AI_VIDEO_CHARACTER_IMAGE,
          file: {
            ...file,
            originalname: generatedFilename,
            size: fileSize,
          },
        });

        storedUrl = uploadRecord.storageUrl || uploadRecord.url;
        storageKey = uploadRecord.storageKey || uploadRecord.key;
      } catch (err) {
        if (!this.storageProvider) {
          throw err;
        }
      }
    }

    if (!storedUrl && this.storageProvider) {
      const stored = await this.storageProvider.upload({
        buffer: file.buffer,
        originalName: generatedFilename,
        mimeType,
        size: fileSize,
        purpose: UploadPurpose.AI_VIDEO_CHARACTER_IMAGE,
        userId,
        organizationId,
      });

      storedUrl = stored.url;
      storageKey = stored.key;
    }

    if (!storedUrl) {
      throw new AppError(
        "Storage provider is not configured or failed to store file.",
        500,
        "STORAGE_FAILED",
      );
    }

    return {
      url: storedUrl,
      path: storageKey || `character-reference/${organizationId}/${uniqueId}.${extension}`,
      storageKey,
      originalName: file.originalname,
      mimeType,
      size: fileSize,
    };
  }
}
