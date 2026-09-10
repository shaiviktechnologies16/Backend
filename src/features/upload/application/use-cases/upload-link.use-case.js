import { Upload } from "../../domain/entities/upload.entity.js";
import { UploadPurpose } from "../../domain/constants/upload-purpose.js";
import { UploadStatus } from "../../domain/constants/upload-status.js";

export class UploadLinkUseCase {
  constructor({ uploadRepository, uploadValidator }) {
    this.uploadRepository = uploadRepository;
    this.uploadValidator = uploadValidator;
  }

  async execute({
    userId,
    organizationId = null,
    projectId = null,
    sourceUrl,
    metadata = null,
  }) {
    this.uploadValidator.validatePurpose(UploadPurpose.KNOWLEDGE_LINK);

    this.uploadValidator.validateContext({
      purpose: UploadPurpose.KNOWLEDGE_LINK,
      organizationId,
      projectId,
    });

    await this.uploadValidator.validateLink(sourceUrl);

    const upload = new Upload({
      purpose: UploadPurpose.KNOWLEDGE_LINK,
      uploadedBy: userId,
      organizationId,
      projectId,
      sourceUrl,
      status: UploadStatus.UPLOADED,
      metadata,
    });

    return this.uploadRepository.create(upload);
  }
}
