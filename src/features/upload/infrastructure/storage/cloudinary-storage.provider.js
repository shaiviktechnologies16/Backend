import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import http from "http";
import https from "https";
import { StorageProvider } from "./storage.provider.js";
import { AppError } from "../../../../common/errors/AppError.js";

export class CloudinaryStorageProvider extends StorageProvider {
  constructor() {
    super();

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    this.cloudinary = cloudinary;
  }

  async upload({
    buffer,
    originalName,
    mimeType,
    purpose,
    organizationId,
    projectId,
  }) {
    try {
      const folderParts = [
        "shaivik-ai",
        purpose,
        organizationId,
        projectId,
      ].filter(Boolean);

      const folder = folderParts.join("/");

      const publicId = `${Date.now()}-${originalName
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "-")}`;

      const result = await new Promise((resolve, reject) => {
        let isSettled = false;
        const timeoutTimer = setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            reject(
              new AppError(
                "Cloudinary upload timed out after 30 seconds.",
                504,
                "UPLOAD_TIMEOUT",
              ),
            );
          }
        }, 30000);

        const uploadStream = this.cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: "auto",
            use_filename: false,
            unique_filename: false,
          },
          (error, uploadResult) => {
            clearTimeout(timeoutTimer);
            if (isSettled) return;
            isSettled = true;

            if (error) {
              reject(error);
              return;
            }

            resolve(uploadResult);
          },
        );

        uploadStream.end(buffer);
      });

      return {
        provider: "CLOUDINARY",
        key: result.public_id,
        url: result.secure_url,
      };
    } catch (error) {
      console.error("Cloudinary upload failed:", error);

      throw new AppError("File upload failed.", 500, "UPLOAD_FAILED");
    }
  }

  async delete(key) {
    if (!key) {
      return;
    }

    try {
      await this.cloudinary.uploader.destroy(key, {
        resource_type: "image",
        invalidate: true,
      });
    } catch (error) {
      console.error("Cloudinary delete failed:", error);
    }
  }

  async getUrl(key) {
    if (!key) {
      return null;
    }

    return this.cloudinary.url(key, {
      secure: true,
      resource_type: "auto",
    });
  }

  async downloadToTemp(uploadRecord, targetFilePath) {
    // 1. If key exists locally (e.g. testing fallback), check disk existence
    if (uploadRecord.storageKey) {
      try {
        const candidate = path.resolve(uploadRecord.storageKey);
        const stats = await fs.stat(candidate);
        if (stats.isFile() && stats.size > 0) {
          await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
          await fs.copyFile(candidate, targetFilePath);
          return targetFilePath;
        }
      } catch {}
    }

    // 2. Resolve download URL
    let url = uploadRecord.storageUrl;
    if (!url && uploadRecord.storageKey) {
      url = await this.getUrl(uploadRecord.storageKey);
    }

    if (!url) {
      throw new AppError(
        `Cloudinary URL not available for upload ${uploadRecord.id}`,
        404,
        "STORAGE_URL_NOT_FOUND",
      );
    }

    await fs.mkdir(path.dirname(targetFilePath), { recursive: true });

    return new Promise((resolve, reject) => {
      const httpModule = url.startsWith("https") ? https : http;
      const fileStream = fsSync.createWriteStream(targetFilePath);

      const handleResponse = (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const redirectUrl = res.headers.location;
          const redirectModule = redirectUrl.startsWith("https") ? https : http;
          redirectModule.get(redirectUrl, handleResponse).on("error", (err) => {
            fileStream.close();
            reject(
              new AppError(
                `Download redirect error: ${err.message}`,
                500,
                "CLOUDINARY_DOWNLOAD_FAILED",
              ),
            );
          });
          return;
        }

        if (res.statusCode !== 200) {
          fileStream.close();
          return reject(
            new AppError(
              `Failed to download asset from Cloudinary (HTTP ${res.statusCode})`,
              500,
              "CLOUDINARY_DOWNLOAD_FAILED",
            ),
          );
        }

        res.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close(() => resolve(targetFilePath));
        });
      };

      const request = httpModule.get(url, handleResponse);
      request.on("error", (err) => {
        fileStream.close();
        fsSync.unlink(targetFilePath, () => {});
        reject(
          new AppError(
            `Cloudinary download stream error: ${err.message}`,
            500,
            "CLOUDINARY_DOWNLOAD_ERROR",
          ),
        );
      });
    });
  }
}
