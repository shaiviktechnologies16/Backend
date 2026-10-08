import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { UploadPurpose } from "../../domain/constants/upload-purpose.js";

export class UploadController {
  constructor({
    uploadFileUseCase,
    uploadLinkUseCase,
    getUploadsByPurposeUseCase,
  }) {
    this.uploadFileUseCase = uploadFileUseCase;
    this.uploadLinkUseCase = uploadLinkUseCase;
    this.getUploadsByPurposeUseCase = getUploadsByPurposeUseCase;
  }

  listByPurpose = asyncHandler(async (req, res) => {
    const { purpose } = req.query;
    const userId = req.user?.id || null;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const result = await this.getUploadsByPurposeUseCase.execute({
      purpose,
      userId,
      limit,
      offset,
    });

    return res.json({
      success: true,
      message: "Uploads retrieved successfully.",
      data: result.uploads,
      meta: {
        total: result.total,
        limit,
        offset,
      },
    });
  });

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
