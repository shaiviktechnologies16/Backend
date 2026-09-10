import { createPublicChatController } from "./controller/public-chat.controller.js";
import { GetPublicAgentConfigUseCase } from "./application/usecase/get-public-agent-config.usecase.js";
import { CheckPublicChatAbuseUseCase } from "./application/usecase/check-public-chat-abuse.usecase.js";
import { PublicChatAbuseRepositoryImpl } from "./infrastructure/repositories/public-chat-abuse.repository.impl.js";

export const createPublicChatModule = ({
  agentRepository,
  getPublicOrganizationUseCase,
  checkPlanUsageUseCase,
}) => {
  const publicAgentConfigUseCase = new GetPublicAgentConfigUseCase({
    agentRepository,
    getPublicOrganizationUseCase,
  });

  const publicChatAbuseRepository = new PublicChatAbuseRepositoryImpl();

  const checkPublicChatAbuseUseCase = new CheckPublicChatAbuseUseCase({
    publicChatAbuseRepository,
    checkPlanUsageUseCase,
  });

  const publicChatController = createPublicChatController({
    publicAgentConfigUseCase,
    checkPublicChatAbuseUseCase,
  });

  return {
    publicAgentConfigUseCase,
    checkPublicChatAbuseUseCase,
    publicChatController,
  };
};
