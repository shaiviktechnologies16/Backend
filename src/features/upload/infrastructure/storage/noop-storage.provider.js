import { StorageProvider } from "./storage.provider.js";
import { AppError } from "../../../../common/errors/AppError.js";

export class NoopStorageProvider extends StorageProvider {
  async upload() {
    throw new AppError(
      "File storage is not configured.",
      503,
      "UPLOAD_STORAGE_NOT_CONFIGURED",
    );
  }

  async delete() {
    throw new AppError(
      "File storage is not configured.",
      503,
      "UPLOAD_STORAGE_NOT_CONFIGURED",
    );
  }

  async getUrl() {
    throw new AppError(
      "File storage is not configured.",
      503,
      "UPLOAD_STORAGE_NOT_CONFIGURED",
    );
  }
}
