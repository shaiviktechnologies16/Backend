import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { ValidationError } from "../../../../common/errors/ValidationError.js";
import { AppError } from "../../../../common/errors/AppError.js";
import { AiVideoValidator } from "../validators/ai-video.validator.js";

function getOrganizationId(req) {
  const orgId =
    req.context?.organization?.id ||
    req.context?.organizationId ||
    req.user?.organizationId ||
    null;

  if (!orgId) {
    const err = new ValidationError(
      "Organization context is required. Please select an organization.",
    );
    err.errorCode = "ORGANIZATION_CONTEXT_REQUIRED";
    throw err;
  }

  return orgId;
}

function getUserId(req) {
  const userId = req.user?.id || req.context?.user?.id || null;
  if (!userId) {
    throw new ValidationError("User authentication context is required.");
  }
  return userId;
}

export class VideoCharacterController {
  constructor({
    createVideoCharacterUseCase,
    getVideoCharacterUseCase,
    listVideoCharactersUseCase,
    uploadCharacterReferenceImageUseCase,
  }) {
    this.createVideoCharacterUseCase = createVideoCharacterUseCase;
    this.getVideoCharacterUseCase = getVideoCharacterUseCase;
    this.listVideoCharactersUseCase = listVideoCharactersUseCase;
    this.uploadCharacterReferenceImageUseCase = uploadCharacterReferenceImageUseCase;
  }

  uploadReferenceImage = asyncHandler(async (req, res) => {
    const organizationId = getOrganizationId(req);
    const userId = getUserId(req);

    if (!req.file) {
      const err = new ValidationError("Image file is required.");
      err.errorCode = "MISSING_IMAGE_FILE";
      throw err;
    }

    if (!this.uploadCharacterReferenceImageUseCase) {
      throw new AppError(
        "Upload reference image use case is not configured.",
        500,
        "SERVICE_UNAVAILABLE",
      );
    }

    const result = await this.uploadCharacterReferenceImageUseCase.execute({
      userId,
      organizationId,
      file: req.file,
    });

    return res.status(201).json({
      success: true,
      message: "Character reference image uploaded successfully.",
      data: result,
    });
  });

  create = asyncHandler(async (req, res) => {
    AiVideoValidator.validateCreateCharacterInput(req.body);

    const organizationId = getOrganizationId(req);
    const createdById = getUserId(req);

    const {
      name,
      description,
      referenceImageUrl,
      uploadedImageUrl,
      style,
      metadata,
    } = req.body;

    const character = await this.createVideoCharacterUseCase.execute({
      organizationId,
      createdById,
      name,
      description,
      referenceImageUrl,
      uploadedImageUrl,
      style,
      metadata,
    });

    return res.status(201).json({
      success: true,
      message: "Video character created successfully.",
      data: character,
      character: character,
    });
  });

  get = asyncHandler(async (req, res) => {
    const { characterId } = req.params;
    AiVideoValidator.validateUUID(characterId, "Character ID");

    const organizationId = getOrganizationId(req);

    const character = await this.getVideoCharacterUseCase.execute({
      organizationId,
      characterId,
    });

    return res.json({
      success: true,
      data: character,
      character: character,
    });
  });

  list = asyncHandler(async (req, res) => {
    AiVideoValidator.validatePaginationInput(req.query);
    const organizationId = getOrganizationId(req);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;

    const result = await this.listVideoCharactersUseCase.execute({
      organizationId,
      page,
      limit,
    });

    return res.json({
      success: true,
      data: result.characters,
      characters: result.characters,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  });
}
