import { Upload } from "../../domain/entities/upload.entity.js";
import { UploadStatus } from "../../domain/constants/upload-status.js";

export class UploadFileUseCase {
  constructor({
    uploadRepository,
    storageProvider,
    uploadValidator,
  }) {
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

    return this.uploadRepository.create(upload);
  }
}
