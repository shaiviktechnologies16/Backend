import { AppError } from "../../../../common/errors/AppError.js";
import { Lead } from "../../domain/entities/lead.entity.js";

export class CaptureLeadUseCase {
  constructor({
    leadRepository,
    agentRepository,
    conversationRepository,
    sendLeadToWhatsappUseCase,
  }) {
    this.leadRepository = leadRepository;
    this.agentRepository = agentRepository;
    this.conversationRepository = conversationRepository;
    this.sendLeadToWhatsappUseCase = sendLeadToWhatsappUseCase;
  }

  async execute({
    agentId,
    conversationId = null,
    visitorId = null,
    name = null,
    phone = null,
    email = null,
    requirement = null,
    source = "AI_AGENT",
    status = "NEW",
    metadata = {},
  }) {
    const agent = await this.agentRepository.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    }

    const organizationId = agent.project?.organizationId;

    if (!organizationId) {
      throw new AppError(
        "Agent project organization could not be resolved.",
        500,
        "AGENT_ORGANIZATION_NOT_FOUND",
      );
    }

    let conversation = null;

    if (conversationId) {
      conversation = await this.conversationRepository.findById(conversationId);

      if (!conversation) {
        throw new AppError(
          "Conversation not found.",
          404,
          "CONVERSATION_NOT_FOUND",
        );
      }

      if (conversation.agentId !== agentId) {
        throw new AppError(
          "Conversation does not belong to agent.",
          403,
          "INVALID_AGENT_CONVERSATION",
        );
      }

      if (visitorId && conversation.visitorId !== visitorId) {
        throw new AppError(
          "Conversation does not belong to visitor.",
          403,
          "INVALID_VISITOR_CONVERSATION",
        );
      }
    }

    if (conversationId) {
      const existing = await this.leadRepository.findExistingForConversation(
        conversationId,
        visitorId,
      );

      if (existing) {
        const updates = {};

        if (name && name !== existing.name) {
          updates.name = name;
        }

        if (phone && phone !== existing.phone) {
          updates.phone = phone;
        }

        if (email && email !== existing.email) {
          updates.email = email;
        }

        if (requirement && requirement !== existing.requirement) {
          updates.requirement = requirement;
        }

        if (source && source !== existing.source) {
          updates.source = source;
        }

        if (status && status !== existing.status) {
          updates.status = status;
        }

        if (
          metadata &&
          typeof metadata === "object" &&
          Object.keys(metadata).length > 0
        ) {
          updates.metadata = {
            ...(existing.metadata ?? {}),
            ...metadata,
          };
        }

        const updatedLead =
          Object.keys(updates).length > 0
            ? await this.leadRepository.update(existing.id, updates)
            : existing;

        let whatsapp = null;

        try {
          whatsapp = await this.sendLeadToWhatsappUseCase.execute({
            organizationId,
            lead: updatedLead,
          });
        } catch (error) {
          whatsapp = {
            sent: false,
            error: error.message,
          };
        }

        return {
          lead: updatedLead,
          whatsapp,
        };
      }
    }

    const lead = new Lead({
      organizationId,
      projectId: agent.projectId,
      agentId,
      conversationId,
      visitorId,
      name,
      phone,
      email,
      requirement,
      source,
      status,
      metadata,
    });

    const createdLead = await this.leadRepository.create(lead);

    let whatsapp = null;

    try {
      whatsapp = await this.sendLeadToWhatsappUseCase.execute({
        organizationId,
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
