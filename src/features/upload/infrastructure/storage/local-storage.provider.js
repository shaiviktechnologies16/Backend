import fs from "fs/promises";
import path from "path";
import { StorageProvider } from "./storage.provider.js";
import { AppError } from "../../../../common/errors/AppError.js";

export class LocalStorageProvider extends StorageProvider {
  constructor() {
    super();

    this.basePath = path.resolve("uploads");
  }

  async upload({ buffer, originalName, purpose }) {
    try {
      await fs.mkdir(this.basePath, {
        recursive: true,
      });

      const fileName = `${Date.now()}-${originalName}`;

      const filePath = path.join(this.basePath, purpose, fileName);

      await fs.mkdir(path.dirname(filePath), {
        recursive: true,
      });

      await fs.writeFile(filePath, buffer);

      return {
        provider: "LOCAL",
        key: filePath,
        url: `/uploads/${purpose}/${fileName}`,
      };
    } catch (error) {
      throw new AppError("File upload failed.", 500, "UPLOAD_FAILED");
    }
  }

  async delete() {
    return;
  }

  async getUrl(key) {
    return key;
  }

  async downloadToTemp(uploadRecord, targetFilePath) {
    const candidates = [];
    if (uploadRecord.storageKey) {
      candidates.push(path.resolve(uploadRecord.storageKey));
      candidates.push(path.resolve(process.cwd(), uploadRecord.storageKey));
    }
    if (uploadRecord.storageUrl) {
      const filename = path.basename(uploadRecord.storageUrl);
      candidates.push(path.resolve(this.basePath, filename));
      candidates.push(
        path.resolve(this.basePath, uploadRecord.purpose || "", filename),
      );
      candidates.push(path.resolve(process.cwd(), "uploads", filename));
      candidates.push(
        path.resolve(
          process.cwd(),
          "uploads",
          uploadRecord.purpose || "",
          filename,
        ),
      );
    }

    for (const candidate of candidates) {
      try {
        const stats = await fs.stat(candidate);
        if (stats.isFile() && stats.size > 0) {
          await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
          await fs.copyFile(candidate, targetFilePath);
          return targetFilePath;
        }
      } catch {}
    }

    throw new AppError(
      `File on disk not accessible for upload ${uploadRecord.id}`,
      404,
      "LOCAL_FILE_NOT_ACCESSIBLE",
    );
  }
}
