import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { UploadPurpose } from "../../domain/constants/upload-purpose.js";

export class UploadController {
  constructor({ uploadFileUseCase, uploadLinkUseCase }) {
    this.uploadFileUseCase = uploadFileUseCase;
    this.uploadLinkUseCase = uploadLinkUseCase;
  }

  upload = asyncHandler(async (req, res) => {
    const { purpose, sourceUrl = null, metadata = null } = req.body;

    const organizationId = req.context?.organization?.id || null;

    const projectId = req.context?.project?.id || null;

    if (purpose === UploadPurpose.KNOWLEDGE_LINK) {
      const upload = await this.uploadLinkUseCase.execute({
        userId: req.user.id,
        organizationId,
        projectId,
        sourceUrl,
        metadata,
      });

      return res.status(201).json({
        success: true,
        message: "Link uploaded successfully.",
        data: upload,
      });
    }

    const upload = await this.uploadFileUseCase.execute({
      userId: req.user.id,
      purpose,
      organizationId,
      projectId,
      file: req.file,
      metadata,
    });

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully.",
      data: upload,
    });
  });
}
