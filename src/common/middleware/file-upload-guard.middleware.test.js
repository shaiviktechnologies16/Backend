import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeUploadedFilename,
  detectDangerousDoubleExtension,
  validateUploadedFileMimeType,
} from "./file-upload-guard.middleware.js";

test("sanitizeUploadedFilename strips path traversal and invalid characters", () => {
  assert.equal(sanitizeUploadedFilename("../../../etc/passwd"), "passwd");
  assert.equal(
    sanitizeUploadedFilename("..\\..\\windows\\system32.dll"),
    "system32.dll",
  );
  assert.equal(
    sanitizeUploadedFilename("my image file (1).png"),
    "my_image_file_1_.png",
  );
});

test("detectDangerousDoubleExtension identifies dangerous extensions", () => {
  assert.equal(detectDangerousDoubleExtension("shell.php.png"), true);
  assert.equal(detectDangerousDoubleExtension("exploit.exe.jpg"), true);
  assert.equal(detectDangerousDoubleExtension("script.sh.pdf"), true);
  assert.equal(detectDangerousDoubleExtension("document.pdf"), false);
  assert.equal(detectDangerousDoubleExtension("avatar.png"), false);
});

test("validateUploadedFileMimeType approves whitelisted and rejects dangerous mime types", () => {
  assert.equal(validateUploadedFileMimeType("image/jpeg"), true);
  assert.equal(validateUploadedFileMimeType("application/pdf"), true);
  assert.equal(validateUploadedFileMimeType("application/octet-stream"), false);
  assert.equal(validateUploadedFileMimeType("text/html"), false);
  assert.equal(validateUploadedFileMimeType("application/x-msdownload"), false);
});
