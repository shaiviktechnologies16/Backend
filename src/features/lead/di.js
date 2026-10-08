import { CaptureLeadUseCase } from "./application/use-cases/capture-lead.usecase.js";
import { CreatePublicEnquiryUseCase } from "./application/use-cases/create-public-enquiry.usecase.js";
import { GetOrganizationEnquiriesUseCase } from "./application/use-cases/get-organization-enquiries.usecase.js";
import { UpdateLeadStatusUseCase } from "./application/use-cases/update-lead-status.usecase.js";

import { createPublicEnquiryController } from "./presentation/controllers/public-enquiry.controller.js";
import { createGetOrganizationEnquiriesController } from "./presentation/controllers/get-organization-enquiries.controller.js";
import { createUpdateLeadStatusController } from "./presentation/controllers/update-lead-status.controller.js";

import { LeadRepositoryImpl } from "./infrastructure/repositories/lead.repository.impl.js";

export const createLeadModule = ({
  dataSource,
  agentRepository,
  conversationRepository,
  projectRepository,
  sendLeadToWhatsappUseCase,
  webhookDispatcherService,
}) => {
  const leadRepository = new LeadRepositoryImpl(dataSource);

  const captureLeadUseCase = new CaptureLeadUseCase({
    leadRepository,
    agentRepository,
    conversationRepository,
    sendLeadToWhatsappUseCase,
    webhookDispatcherService,
  });

  const createPublicEnquiryUseCase = new CreatePublicEnquiryUseCase({
    leadRepository,
    projectRepository,
    sendLeadToWhatsappUseCase,
  });

  const getOrganizationEnquiriesUseCase = new GetOrganizationEnquiriesUseCase({
    leadRepository,
  });

  const updateLeadStatusUseCase = new UpdateLeadStatusUseCase({
    leadRepository,
  });

  const publicEnquiryController = createPublicEnquiryController({
    createPublicEnquiryUseCase,
  });

  const getOrganizationEnquiriesController =
    createGetOrganizationEnquiriesController({
      getOrganizationEnquiriesUseCase,
    });

  const updateLeadStatusController = createUpdateLeadStatusController({
    updateLeadStatusUseCase,
  });

  return {
    leadRepository,
    captureLeadUseCase,
    createPublicEnquiryUseCase,
    getOrganizationEnquiriesUseCase,
    updateLeadStatusUseCase,
    publicEnquiryController,
    getOrganizationEnquiriesController,
    updateLeadStatusController,
  };
};
