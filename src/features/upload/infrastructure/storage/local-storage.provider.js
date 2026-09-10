import fs from "fs/promises";
import path from "path";
import { StorageProvider } from "./storage.provider.js";
import { AppError } from "../../../../common/errors/AppError.js";

export class LocalStorageProvider extends StorageProvider {
  constructor() {
    super();

    this.basePath = path.resolve("uploads");
  }

  async upload({
    buffer,
    originalName,
    purpose,
  }) {
    try {
      await fs.mkdir(this.basePath, {
        recursive: true,
      });

      const fileName = `${Date.now()}-${originalName}`;

      const filePath = path.join(
        this.basePath,
        purpose,
        fileName,
      );

      await fs.mkdir(
        path.dirname(filePath),
        {
          recursive: true,
        },
      );

      await fs.writeFile(
        filePath,
        buffer,
      );

      return {
        provider: "LOCAL",
        key: filePath,
        url: `/uploads/${purpose}/${fileName}`,
      };
    } catch (error) {
      throw new AppError(
        "File upload failed.",
        500,
        "UPLOAD_FAILED",
      );
    }
  }

  async delete() {
    return;
  }

  async getUrl(key) {
    return key;
  }
}
