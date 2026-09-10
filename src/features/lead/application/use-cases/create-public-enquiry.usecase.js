import { AppError } from "../../../../common/errors/AppError.js";
import { Lead } from "../../domain/entities/lead.entity.js";

export class CreatePublicEnquiryUseCase {
  constructor({
    leadRepository,
    projectRepository,
    sendLeadToWhatsappUseCase,
  }) {
    this.leadRepository = leadRepository;
    this.projectRepository = projectRepository;
    this.sendLeadToWhatsappUseCase = sendLeadToWhatsappUseCase;
  }

  async execute({
    projectId,
    name = null,
    phone = null,
    email = null,
    company = null,
    requirement = null,
    metadata = {},
  }) {
    if (!projectId) {
      throw new AppError("Project ID is required.", 400, "PROJECT_ID_REQUIRED");
    }

    if (!name) {
      throw new AppError("Name is required.", 400, "NAME_REQUIRED");
    }

    if (!phone) {
      throw new AppError("Phone number is required.", 400, "PHONE_REQUIRED");
    }

    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      throw new AppError("Project not found.", 404, "PROJECT_NOT_FOUND");
    }

    if (!project.organizationId) {
      throw new AppError(
        "Project organization could not be resolved.",
        500,
        "PROJECT_ORGANIZATION_NOT_FOUND",
      );
    }

    const lead = new Lead({
      organizationId: project.organizationId,
      projectId: project.id,
      agentId: null,
      conversationId: null,
      visitorId: null,
      name,
      phone,
      email,
      requirement,
      source: "WEBSITE_FORM",
      status: "NEW",
      metadata: {
        ...metadata,
        ...(company ? { company } : {}),
      },
    });

    const createdLead = await this.leadRepository.create(lead);

    let whatsapp = null;

    try {
      whatsapp = await this.sendLeadToWhatsappUseCase.execute({
        organizationId: project.organizationId,
        lead: createdLead,
      });
    } catch (error) {
      whatsapp = {
        sent: false,
        error: error.message,
      };
    }

    return {
      lead: createdLead,
      whatsapp,
    };
  }
}
