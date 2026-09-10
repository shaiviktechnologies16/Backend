import { AgentRepositoryImpl } from "./infrastructure/repositories/agent.repository.impl.js";

import { CreateAgentUseCase } from "./application/use-cases/create-agent.usecase.js";
import { GetAgentUseCase } from "./application/use-cases/get-agent.usecase.js";
import { GetProjectAgentsUseCase } from "./application/use-cases/get-project-agents.usecase.js";
import { UpdateAgentUseCase } from "./application/use-cases/update-agent.usecase.js";
import { DeleteAgentUseCase } from "./application/use-cases/delete-agent.usecase.js";
import { SetDefaultAgentUseCase } from "./application/use-cases/set-default-agent.usecase.js";
import { EnablePublicAgentUseCase } from "./application/use-cases/enable-public-agent.usecase.js";
import { DisablePublicAgentUseCase } from "./application/use-cases/disable-public-agent.usecase.js";
import { GetOrganizationAgentsUseCase } from "./application/use-cases/get-organization-agents.usecase.js";
import { RegeneratePublicAgentKeyUseCase } from "./application/use-cases/regenerate-public-agent-key.usecase.js";

import { AgentController } from "./presentation/controllers/agent.controller.js";

export const createAgentModule = ({
  dataSource,
  projectRepository,
  checkProjectAccessUseCase,
  organizationModelAccessRepository,
  organizationMemberRepository,
  organizationModelEntitlementService = null,
}) => {
  const agentRepository = new AgentRepositoryImpl(dataSource);

  const createAgentUseCase = new CreateAgentUseCase({
    agentRepository,
    projectRepository,
    checkProjectAccessUseCase,
    organizationModelAccessRepository,
    organizationModelEntitlementService,
  });

  const getAgentUseCase = new GetAgentUseCase({
    agentRepository,
    checkProjectAccessUseCase,
  });

  const getProjectAgentsUseCase = new GetProjectAgentsUseCase({
    agentRepository,
    checkProjectAccessUseCase,
  });

  const updateAgentUseCase = new UpdateAgentUseCase({
    agentRepository,
    projectRepository,
    checkProjectAccessUseCase,
    organizationModelAccessRepository,
    organizationModelEntitlementService,
  });

  const getOrganizationAgentsUseCase = new GetOrganizationAgentsUseCase({
    agentRepository,
    organizationMemberRepository,
  });

  const deleteAgentUseCase = new DeleteAgentUseCase({
    agentRepository,
    checkProjectAccessUseCase,
  });

  const setDefaultAgentUseCase = new SetDefaultAgentUseCase({
    agentRepository,
    checkProjectAccessUseCase,
  });

  const enablePublicAgentUseCase = new EnablePublicAgentUseCase({
    agentRepository,
    checkProjectAccessUseCase,
  });

  const disablePublicAgentUseCase = new DisablePublicAgentUseCase({
    agentRepository,
  });

  const regeneratePublicAgentKeyUseCase = new RegeneratePublicAgentKeyUseCase({
    agentRepository,
    checkProjectAccessUseCase,
  });

  const agentController = new AgentController({
    createAgentUseCase,
    getAgentUseCase,
    getProjectAgentsUseCase,
    getOrganizationAgentsUseCase,
    updateAgentUseCase,
    deleteAgentUseCase,
    setDefaultAgentUseCase,
    enablePublicAgentUseCase,
    disablePublicAgentUseCase,
    regeneratePublicAgentKeyUseCase,
  });

  return {
    agentRepository,
    createAgentUseCase,
    getAgentUseCase,
    getProjectAgentsUseCase,
    getOrganizationAgentsUseCase,
    updateAgentUseCase,
    deleteAgentUseCase,
    setDefaultAgentUseCase,
    enablePublicAgentUseCase,
    disablePublicAgentUseCase,
    regeneratePublicAgentKeyUseCase,
    agentController,
  };
};
