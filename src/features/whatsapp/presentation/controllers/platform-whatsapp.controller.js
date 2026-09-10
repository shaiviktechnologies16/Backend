import { asyncHandler } from "../../../../common/utils/asyncHandler.js";

export class PlatformWhatsappController {
  constructor({
    createPlatformWhatsappConnectionUseCase,
    connectPlatformWhatsappConnectionUseCase,
    getPlatformWhatsappConnectionsUseCase,
    getPlatformWhatsappConnectionUseCase,
    updatePlatformWhatsappConnectionUseCase,
    deletePlatformWhatsappConnectionUseCase,
  }) {
    this.createPlatformWhatsappConnectionUseCase =
      createPlatformWhatsappConnectionUseCase;

    this.connectPlatformWhatsappConnectionUseCase =
      connectPlatformWhatsappConnectionUseCase;

    this.getPlatformWhatsappConnectionsUseCase =
      getPlatformWhatsappConnectionsUseCase;

    this.getPlatformWhatsappConnectionUseCase =
      getPlatformWhatsappConnectionUseCase;

    this.updatePlatformWhatsappConnectionUseCase =
      updatePlatformWhatsappConnectionUseCase;

    this.deletePlatformWhatsappConnectionUseCase =
      deletePlatformWhatsappConnectionUseCase;
  }

  create = asyncHandler(async (req, res) => {
    const result = await this.createPlatformWhatsappConnectionUseCase.execute(
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Platform WhatsApp connection created successfully.",
      data: result,
    });
  });

  getAll = asyncHandler(async (req, res) => {
    const connections =
      await this.getPlatformWhatsappConnectionsUseCase.execute();

    res.status(200).json({
      success: true,
      data: connections,
    });
  });

  getById = asyncHandler(async (req, res) => {
    const connection = await this.getPlatformWhatsappConnectionUseCase.execute({
      connectionId: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: connection,
    });
  });

  update = asyncHandler(async (req, res) => {
    const result = await this.updatePlatformWhatsappConnectionUseCase.execute({
      connectionId: req.params.id,
      data: req.body,
    });

    res.status(200).json({
      success: true,
      message: "Platform WhatsApp connection updated successfully.",
      data: result,
    });
  });

  connect = asyncHandler(async (req, res) => {
    const result = await this.connectPlatformWhatsappConnectionUseCase.execute({
      connectionId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Platform WhatsApp connection is connecting.",
      data: result,
    });
  });

  delete = asyncHandler(async (req, res) => {
    const result = await this.deletePlatformWhatsappConnectionUseCase.execute({
      connectionId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Platform WhatsApp connection deleted successfully.",
      data: result,
    });
  });
}
