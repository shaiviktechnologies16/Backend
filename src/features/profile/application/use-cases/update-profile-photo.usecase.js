import path from "path";
import { UploadPurpose } from "../../../upload/domain/constants/upload-purpose.js";

export class UpdateProfilePhotoUseCase {
  constructor({ userRepository, uploadFileUseCase }) {
    this.userRepository = userRepository;
    this.uploadFileUseCase = uploadFileUseCase;
  }

  async execute({ userId, file }) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }

    if (!file) {
      const error = new Error("PROFILE_PHOTO_REQUIRED");
      error.statusCode = 400;
      throw error;
    }

    const extension = path.extname(file.originalname || "").toLowerCase();

    const allowedExtensions = new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
    ]);

    const isImageMimeType = file.mimetype?.startsWith("image/");
    const isImageExtension = allowedExtensions.has(extension);

    if (!isImageMimeType && !isImageExtension) {
      const error = new Error("PROFILE_PHOTO_MUST_BE_IMAGE");
      error.statusCode = 400;
      throw error;
    }

    if (file.size > 5 * 1024 * 1024) {
      const error = new Error("PROFILE_PHOTO_SIZE_LIMIT_EXCEEDED");
      error.statusCode = 400;
      throw error;
    }

    const upload = await this.uploadFileUseCase.execute({
      userId,
      purpose: UploadPurpose.PROFILE_PHOTO,
      organizationId: null,
      projectId: null,
      file,
    });

    user.profilePhotoUploadId = upload.id;

    const updatedUser = await this.userRepository.update(user);

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      platformRole: updatedUser.platformRole,
      role: updatedUser.role,
      profilePhotoUploadId: updatedUser.profilePhotoUploadId,
      profilePhotoUrl: upload.storageUrl,
      createdAt: updatedUser.createdAt,
    };
  }
}
