import { ContextRepositoryImpl } from "./infrastructure/repositories/context.repository.impl.js";
import { ContextService } from "./domain/services/context.service.js";
import { ResolveOrganizationContextUseCase } from "./application/use-cases/resolve-organization-context.usecase.js";
import { ResolveProjectContextUseCase } from "./application/use-cases/resolve-project-context.usecase.js";
import { ResolveAgentContextUseCase } from "./application/use-cases/resolve-agent-context.usecase.js";
import { ResolveContextUseCase } from "./application/use-cases/resolve-context.usecase.js";
import { WorkspaceMemberPermissionRepositoryImpl } from "../../workspace/members/infrastructure/repositories/workspace-member-permission.repository.impl.js";

import {
  authenticateMiddleware,
  organizationContextMiddleware,
  projectContextMiddleware,
  agentContextMiddleware,
  contextBuilderMiddleware,
  workspaceContextMiddleware,
} from "./presentation/middleware/index.js";

export function createContextModule({
  dataSource,
  userRepository,
  organizationRepository,
  projectRepository,
  agentRepository,
  organizationMemberRepository,
  projectMemberRepository,
  getUserPermissionsUseCase,
  jwtService,
  rbacRepository,
}) {
  const workspaceMemberPermissionRepository =
    new WorkspaceMemberPermissionRepositoryImpl(dataSource);

  const contextRepository = new ContextRepositoryImpl({
    userRepository,
    organizationRepository,
    projectRepository,
    agentRepository,
    organizationMemberRepository,
    projectMemberRepository,
    getUserPermissionsUseCase,
  });

  const contextService = new ContextService({
    contextRepository,
  });

  const resolveOrganizationContextUseCase =
    new ResolveOrganizationContextUseCase({
      organizationMemberRepository,
      organizationRepository,
    });

  const resolveProjectContextUseCase = new ResolveProjectContextUseCase({
    projectRepository,
    projectMemberRepository,
  });

  const resolveAgentContextUseCase = new ResolveAgentContextUseCase({
    agentRepository,
    projectMemberRepository,
    projectRepository,
  });

  const resolveContextUseCase = new ResolveContextUseCase({
    resolveOrganizationContextUseCase,
    resolveProjectContextUseCase,
    resolveAgentContextUseCase,
    organizationMemberRepository,
  });

  const middlewares = {
    authenticateMiddleware: authenticateMiddleware({
      jwtService,
    }),
    organizationContextMiddleware: organizationContextMiddleware({
      resolveOrganizationContextUseCase,
    }),
    projectContextMiddleware: projectContextMiddleware({
      resolveProjectContextUseCase,
    }),
    agentContextMiddleware: agentContextMiddleware({
      resolveAgentContextUseCase,
    }),
    contextBuilderMiddleware: contextBuilderMiddleware({
      resolveContextUseCase,
      workspaceMemberPermissionRepository,
      rbacRepository,
    }),
  };

  middlewares.workspaceContextMiddleware = workspaceContextMiddleware({
    authenticateMiddleware: middlewares.authenticateMiddleware,
    contextBuilderMiddleware: middlewares.contextBuilderMiddleware,
  });

  return {
    contextRepository,
    contextService,
    resolveOrganizationContextUseCase,
    resolveProjectContextUseCase,
    resolveAgentContextUseCase,
    resolveContextUseCase,
    workspaceMemberPermissionRepository,
    middlewares,
  };
}
