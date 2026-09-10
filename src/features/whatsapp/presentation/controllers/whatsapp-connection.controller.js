import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { WhatsappConnectionResponse } from "../../application/dto/responses/whatsapp-connection.response.js";

export class WhatsappConnectionController {
  constructor({
    createWhatsappConnectionUseCase,
    getWhatsappConnectionsUseCase,
    getWhatsappConnectionUseCase,
    updateWhatsappConnectionUseCase,
    deleteWhatsappConnectionUseCase,
    connectWhatsappConnectionUseCase,
    handleEvolutionWebhookUseCase,
  }) {
    this.createWhatsappConnectionUseCase = createWhatsappConnectionUseCase;

    this.getWhatsappConnectionsUseCase = getWhatsappConnectionsUseCase;

    this.getWhatsappConnectionUseCase = getWhatsappConnectionUseCase;

    this.updateWhatsappConnectionUseCase = updateWhatsappConnectionUseCase;

    this.deleteWhatsappConnectionUseCase = deleteWhatsappConnectionUseCase;

    this.connectWhatsappConnectionUseCase = connectWhatsappConnectionUseCase;

    this.handleEvolutionWebhookUseCase = handleEvolutionWebhookUseCase;
  }

  create = asyncHandler(async (req, res) => {
    const connection = await this.createWhatsappConnectionUseCase.execute({
      ...req.body,
      organizationId: req.context.organization.id,
    });

    res.status(201).json({
      success: true,
      message: "WhatsApp connection created successfully.",
      data: new WhatsappConnectionResponse(connection),
    });
  });

  getAll = asyncHandler(async (req, res) => {
    const connections = await this.getWhatsappConnectionsUseCase.execute({
      organizationId: req.context.organization.id,
    });

    res.status(200).json({
      success: true,
      data: connections.map(
        (connection) => new WhatsappConnectionResponse(connection),
      ),
    });
  });

  getById = asyncHandler(async (req, res) => {
    const connection = await this.getWhatsappConnectionUseCase.execute({
      organizationId: req.context.organization.id,
      connectionId: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: new WhatsappConnectionResponse(connection),
    });
  });

  update = asyncHandler(async (req, res) => {
    const connection = await this.updateWhatsappConnectionUseCase.execute({
      organizationId: req.context.organization.id,
      connectionId: req.params.id,
      data: req.body,
    });

    res.status(200).json({
      success: true,
      message: "WhatsApp connection updated successfully.",
      data: new WhatsappConnectionResponse(connection),
    });
  });

  delete = asyncHandler(async (req, res) => {
    const result = await this.deleteWhatsappConnectionUseCase.execute({
      organizationId: req.context.organization.id,
      connectionId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "WhatsApp connection deleted successfully.",
      data: result,
    });
  });

  connect = asyncHandler(async (req, res) => {
    const result = await this.connectWhatsappConnectionUseCase.execute({
      organizationId: req.context.organization.id,
      connectionId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "WhatsApp connection is connecting.",
      data: {
        connection: new WhatsappConnectionResponse(result.connection),
        evolution: result.evolution,
      },
    });
  });

  evolutionWebhook = asyncHandler(async (req, res) => {
    console.log("[EVOLUTION WEBHOOK]", JSON.stringify(req.body, null, 2));
    const result = await this.handleEvolutionWebhookUseCase.execute(req.body);

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}
