export const UploadRules = Object.freeze({
  maxFileSize: 5 * 1024 * 1024,

  allowedMimeTypes: Object.freeze([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",

    "application/pdf",

    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    "text/plain",
    "text/csv",
  ]),
});
