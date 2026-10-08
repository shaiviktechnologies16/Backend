import { Upload } from "../../domain/entities/upload.entity.js";
import { UploadStatus } from "../../domain/constants/upload-status.js";

export class UploadFileUseCase {
  constructor({ uploadRepository, storageProvider, uploadValidator }) {
    this.uploadRepository = uploadRepository;
    this.storageProvider = storageProvider;
    this.uploadValidator = uploadValidator;
  }

  async execute({
    userId,
    purpose,
    organizationId = null,
    projectId = null,
    file,
    metadata = null,
  }) {
    console.log("[VideoUpload] before upload validation");
    this.uploadValidator.validatePurpose(purpose);

    this.uploadValidator.validateContext({
      purpose,
      organizationId,
      projectId,
    });

    console.log("UPLOAD FILE DEBUG:", {
      originalName: file?.originalname,
      mimeType: file?.mimetype,
      size: file?.size,
    });

    this.uploadValidator.validateFile(file);
    console.log("[VideoUpload] after upload validation");

    console.log("[VideoUpload] before storage upload");
    const storedFile = await this.storageProvider.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      purpose,
      userId,
      organizationId,
      projectId,
    });
    console.log("[VideoUpload] after storage upload", { key: storedFile?.key });

    const upload = new Upload({
      purpose,
      uploadedBy: userId,
      organizationId,
      projectId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageProvider: storedFile.provider,
      storageKey: storedFile.key,
      storageUrl: storedFile.url,
      status: UploadStatus.UPLOADED,
      metadata,
    });

    console.log("[VideoUpload] before repository save");
    const createdUpload = await this.uploadRepository.create(upload);
    console.log("[VideoUpload] after repository save / upload completed");

    return createdUpload;
  }
}
