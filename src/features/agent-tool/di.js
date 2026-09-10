import { CreateAgentToolUseCase } from "./application/use-cases/create-agent-tool.usecase.js";
import { GetAgentToolsUseCase } from "./application/use-cases/get-agent-tools.usecase.js";
import { UpdateAgentToolUseCase } from "./application/use-cases/update-agent-tool.usecase.js";
import { DeleteAgentToolUseCase } from "./application/use-cases/delete-agent-tool.usecase.js";
import { AgentToolSchemaService } from "./application/services/agent-tool-schema.service.js";
import { AgentToolExecutorService } from "./application/services/agent-tool-executor.service.js";
import { AgentToolResolverService } from "./application/services/agent-tool-resolver.service.js";
import { AgentToolController } from "./presentation/controllers/agent-tool.controller.js";

export const createAgentToolModule = ({
  agentRepository,
  agentToolRepository,
  workspaceApiKeyRepository,
  encryptionService,
  projectRepository,
  checkProjectAccessUseCase,
  captureLeadUseCase,
}) => {
  const agentToolSchemaService = new AgentToolSchemaService();

  const agentToolExecutorService = new AgentToolExecutorService({
    workspaceApiKeyRepository,
    encryptionService,
    captureLeadUseCase,
  });

  const agentToolResolverService = new AgentToolResolverService(
    agentToolRepository,
  );

  const createAgentToolUseCase = new CreateAgentToolUseCase({
    agentRepository,
    agentToolRepository,
    workspaceApiKeyRepository,
    projectRepository,
    checkProjectAccessUseCase,
  });

  const updateAgentToolUseCase = new UpdateAgentToolUseCase({
    agentToolRepository,
    agentRepository,
    workspaceApiKeyRepository,
    projectRepository,
    checkProjectAccessUseCase,
  });

  const getAgentToolsUseCase = new GetAgentToolsUseCase({
    agentRepository,
    agentToolRepository,
    checkProjectAccessUseCase,
  });

  const deleteAgentToolUseCase = new DeleteAgentToolUseCase({
    agentToolRepository,
    agentRepository,
    checkProjectAccessUseCase,
  });

  const agentToolController = new AgentToolController(
    createAgentToolUseCase,
    getAgentToolsUseCase,
    updateAgentToolUseCase,
    deleteAgentToolUseCase,
  );

  return {
    agentToolRepository,
    agentToolSchemaService,
    agentToolExecutorService,
    agentToolResolverService,
    createAgentToolUseCase,
    getAgentToolsUseCase,
    updateAgentToolUseCase,
    deleteAgentToolUseCase,
    agentToolController,
  };
};
