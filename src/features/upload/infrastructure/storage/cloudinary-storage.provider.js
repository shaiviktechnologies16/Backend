import { v2 as cloudinary } from "cloudinary";
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
        const uploadStream = this.cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: "auto",
            use_filename: false,
            unique_filename: false,
          },
          (error, uploadResult) => {
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
}
