import path from "path";
import sharp from "sharp";
import { UploadRules } from "../../features/upload/domain/constants/upload-rules.js";

const dangerousFileExtensionsBlacklist = new Set([
  "php",
  "phtml",
  "php3",
  "php4",
  "php5",
  "phps",
  "exe",
  "dll",
  "bat",
  "cmd",
  "sh",
  "bash",
  "js",
  "cjs",
  "mjs",
  "vbs",
  "jar",
  "py",
  "pl",
  "cgi",
  "asp",
  "aspx",
  "jsp",
  "htaccess",
  "svg",
  "html",
  "htm",
  "xhtml",
]);

export const sanitizeUploadedFilename = (originalFilenameString) => {
  if (!originalFilenameString || typeof originalFilenameString !== "string") {
    return `upload_${Date.now()}`;
  }

  const filenameWithoutNullBytes = originalFilenameString.replace(/\0/g, "");

  const normalizedSeparatorsFilename = filenameWithoutNullBytes.replace(
    /\\/g,
    "/",
  );

  const baseFilenameOnly = path.basename(normalizedSeparatorsFilename);

  const strippedPathTraversalFilename = baseFilenameOnly.replace(
    /(\.\.[\/\\])+/g,
    "",
  );

  const fileExtensionMatch = strippedPathTraversalFilename.match(/\.([^.]+)$/);
  const fileExtensionName = fileExtensionMatch ? fileExtensionMatch[1] : "";
  const nameWithoutExtension = fileExtensionMatch
    ? strippedPathTraversalFilename.slice(
        0,
        strippedPathTraversalFilename.length - fileExtensionName.length - 1,
      )
    : strippedPathTraversalFilename;

  const sanitizedBaseName = nameWithoutExtension
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_");

  const sanitizedExtensionName = fileExtensionName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

  if (!sanitizedExtensionName) {
    return sanitizedBaseName || `upload_${Date.now()}`;
  }

  return `${sanitizedBaseName}.${sanitizedExtensionName}`;
};

export const detectDangerousDoubleExtension = (originalFilenameString) => {
  if (!originalFilenameString || typeof originalFilenameString !== "string") {
    return false;
  }

  const normalizedFilenameLower = originalFilenameString.toLowerCase();
  const filenamePartsList = normalizedFilenameLower.split(".");

  if (filenamePartsList.length < 3) {
    const singleExtension = filenamePartsList[filenamePartsList.length - 1];
    if (dangerousFileExtensionsBlacklist.has(singleExtension)) {
      return true;
    }
    return false;
  }

  for (let index = 1; index < filenamePartsList.length; index += 1) {
    const currentExtensionPart = filenamePartsList[index];
    if (dangerousFileExtensionsBlacklist.has(currentExtensionPart)) {
      return true;
    }
  }

  return false;
};

export const validateUploadedFileMimeType = (mimeTypeString) => {
  if (!mimeTypeString || typeof mimeTypeString !== "string") {
    return false;
  }

  const normalizedMimeType = mimeTypeString.toLowerCase().trim();

  if (normalizedMimeType === "application/octet-stream") {
    return false;
  }

  return UploadRules.allowedMimeTypes.includes(normalizedMimeType);
};

export const optimizeUploadedImageBufferToUnderFiveMegabytes = async (
  fileBuffer,
  mimeTypeString,
) => {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    return fileBuffer;
  }

  const maximumAllowedBufferByteSize = 5 * 1024 * 1024;
  const isImageMimeType = mimeTypeString.startsWith("image/");

  if (!isImageMimeType) {
    return fileBuffer;
  }

  try {
    let processedBufferResult = fileBuffer;
    const sharpImageInstance = sharp(fileBuffer);
    const imageMetadataDetails = await sharpImageInstance.metadata();

    if (
      processedBufferResult.length > maximumAllowedBufferByteSize ||
      imageMetadataDetails.width > 2048 ||
      imageMetadataDetails.height > 2048
    ) {
      processedBufferResult = await sharpImageInstance
        .resize({
          width: 2048,
          height: 2048,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
    }

    return processedBufferResult;
  } catch (imageOptimizationError) {
    return fileBuffer;
  }
};

export const createMulterFileUploadFilter = () => {
  return (request, file, callback) => {
    if (!file) {
      return callback(null, true);
    }

    const isValidMimeType = validateUploadedFileMimeType(file.mimetype);
    if (!isValidMimeType) {
      const unsupportedTypeError = new Error("UNSUPPORTED_FILE_TYPE");
      unsupportedTypeError.code = "UNSUPPORTED_FILE_TYPE";
      return callback(unsupportedTypeError, false);
    }

    const isDoubleExtensionDangerous = detectDangerousDoubleExtension(
      file.originalname,
    );
    if (isDoubleExtensionDangerous) {
      const dangerousExtensionError = new Error(
        "DANGEROUS_FILE_EXTENSION_DETECTED",
      );
      dangerousExtensionError.code = "DANGEROUS_FILE_EXTENSION_DETECTED";
      return callback(dangerousExtensionError, false);
    }

    file.originalname = sanitizeUploadedFilename(file.originalname);
    return callback(null, true);
  };
};

export const fileUploadGuardMiddleware = async (request, response, next) => {
  try {
    if (request.file) {
      const isDoubleExtensionDangerous = detectDangerousDoubleExtension(
        request.file.originalname,
      );
      if (isDoubleExtensionDangerous) {
        return response.status(400).json({
          success: false,
          error: {
            code: "DANGEROUS_FILE_EXTENSION_DETECTED",
            message: "Uploaded file contains dangerous file extension.",
          },
        });
      }

      request.file.originalname = sanitizeUploadedFilename(
        request.file.originalname,
      );

      if (
        request.file.buffer &&
        request.file.mimetype &&
        request.file.mimetype.startsWith("image/")
      ) {
        const optimizedBufferResult =
          await optimizeUploadedImageBufferToUnderFiveMegabytes(
            request.file.buffer,
            request.file.mimetype,
          );
        request.file.buffer = optimizedBufferResult;
        request.file.size = optimizedBufferResult.length;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
