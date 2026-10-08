import { AppDataSource } from "../database/datasource.js";
import { JwtService, PasswordService } from "../common/security/index.js";
import { createAIModelModule } from "../features/platform/ai-models/di.js";
import { OrganizationModelEntitlementService } from "../features/platform/ai-models/application/services/organization-model-entitlement.service.js";
import { createOrganizationModelAccessModule } from "../features/platform/organization-model-access/di.js";
import { createPlatformApiKeysModule } from "../features/platform/api-keys/di.js";
import { AuthService } from "../features/auth/service/auth.service.js";
import { ConversationService } from "../features/conversation/service/conversation.service.js";
import { PostgresUserRepository } from "../features/auth/repository/postgres/postgres-user.repository.js";
import { PostgresConversationRepository } from "../features/conversation/repository/postgres/postgres-conversation.repository.js";
import { PostgresMessageRepository } from "../features/message/repository/postgres/postgres-message.repository.js";
import { PostgresUsageRepository } from "../features/usage/repository/postgres/postgres-usage.repository.js";
import { ProjectRepositoryImpl } from "../features/project/infrastructure/repositories/project.repository.impl.js";
import { ProjectMemberRepositoryImpl } from "../features/project-member/infrastructure/repositories/project-member.repository.impl.js";
import { createOrganizationModule } from "../features/organization/di.js";
import { createOrganizationMemberModule } from "../features/organization-member/di.js";
import { createOrganizationInvitationModule } from "../features/organization-invitations/di.js";
import { createProjectMemberModule } from "../features/project-member/di.js";
import { createProjectModule } from "../features/project/di.js";
import { createAgentModule } from "../features/agent/di.js";
import { createWhatsappModule } from "../features/whatsapp/di.js";
import { createProfileModule } from "../features/profile/di.js";
import { createAdminModule } from "../features/admin/di.js";
import { createAdminAuthModule } from "../features/admin/admin-auth/di.js";
import { AIContextService } from "../features/ai-context/service/ai-context.service.js";
import { createAIProviderFactory } from "../providers/provider.factory.js";
import { PromptBuilder } from "../features/ai-context/builder/prompt.builder.js";
import { RbacDataSource } from "../features/rbac/infrastructure/datasource/rbac.datasource.js";
import { RbacRepositoryImpl } from "../features/rbac/infrastructure/repositories/rbac.repository.impl.js";
import { GetUserPermissionsUseCase } from "../features/rbac/application/use-cases/get-user-permissions.usecase.js";
import { createContextModule } from "../features/shared/context/di.js";
import { createCompanyProfileModule } from "../features/workspace/company/di.js";
import { createWorkspaceSettingsModule } from "../features/workspace/settings/di.js";
import { createWorkspaceMemberModule } from "../features/workspace/members/di.js";
import { createWorkspaceDashboardModule } from "../features/workspace/dashboard/di.js";
import { createWorkspaceModelModule } from "../features/workspace/models/di.js";
import { createPublicChatModule } from "../features/public-chat/di.js";
import { createAISettingsModule } from "../features/organization/ai-settings/di.js";
import { createKnowledgeModule } from "../features/knowledge/di.js";
import { AgentToolRepositoryImpl } from "../features/agent-tool/infrastructure/repositories/agent-tool.repository.impl.js";
import { createAgentToolModule } from "../features/agent-tool/di.js";
import { createWorkspaceApiKeysModule } from "../features/workspace/api-keys/di.js";
import { createPlatformConfigModule } from "../features/platform/config/di.js";
import { createEmbeddingProviderFactory } from "../providers/embeddings/embedding.provider.factory.js";
import { createEmailService } from "../features/notification/index/index.js";
import { TokenHashService } from "../common/security/token-hash.service.js";
import { OrganizationRepositoryImpl } from "../features/organization/infrastructure/repositories/organization.repository.impl.js";
import { createUploadModule } from "../features/upload/di.js";
import { createPlatformBrandingModule } from "../features/platform/branding/di.js";
import { createWorkspaceBrandingModule } from "../features/workspace/branding/di.js";
import { GetAllPermissionsUseCase } from "../features/rbac/application/use-cases/get-all-permissions.usecase.js";
import { RbacController } from "../features/rbac/presentation/controllers/rbac.controller.js";
import { createAnalyticsModule } from "../features/analytics/di.js";
import { GetAgentUsageSummaryUseCase } from "../features/usage/application/use-cases/get-agent-usage-summary.usecase.js";
import { createPlansModule } from "../features/platform/plans/di.js";
import { createTTSProviderFactory } from "../providers/tts/tts.provider.factory.js";
import { createTTSModule } from "../features/tts/di.js";
import { SynthesizeSpeechUseCase } from "../features/tts/application/usecase/synthesize-speech.usecase.js";
import { createLeadModule } from "../features/lead/di.js";
import { createOrganizationFeatureAccessModule } from "../features/platform/organization-feature-access/di.js";
import { createPaymentModule } from "../features/payment/di.js";
import { PdfInvoiceGenerator } from "../features/invoice/infrastructure/pdf-invoice.generator.js";
import { InvoiceService } from "../features/invoice/application/services/invoice.service.js";
import { createWebhookModule } from "../features/webhook/di.js";
import { createAiVideoModule } from "../features/ai-video/di.js";
import { ModelCostCalculatorService } from "../features/usage/application/services/model-cost-calculator.service.js";
import { BudgetCapGuardService } from "../features/usage/application/services/budget-cap-guard.service.js";
import { GetTokenUsageAnalyticsUseCase } from "../features/usage/application/use-cases/get-token-usage-analytics.usecase.js";

const promptBuilder = new PromptBuilder();
export const jwtService = new JwtService();
const tokenHashService = new TokenHashService();
const passwordService = new PasswordService();
const aiModelModule = createAIModelModule({
  dataSource: AppDataSource,
});
const userRepository = new PostgresUserRepository(AppDataSource);
const conversationRepository = new PostgresConversationRepository(
  AppDataSource,
);
const messageRepository = new PostgresMessageRepository();
const usageRepository = new PostgresUsageRepository(AppDataSource);
const getAgentUsageSummaryUseCase = new GetAgentUsageSummaryUseCase({
  usageRepository,
});
const projectRepository = new ProjectRepositoryImpl(AppDataSource);
const projectMemberRepository = new ProjectMemberRepositoryImpl(AppDataSource);
const agentToolRepository = new AgentToolRepositoryImpl(AppDataSource);
const rbacDataSource = new RbacDataSource();
const rbacRepository = new RbacRepositoryImpl(rbacDataSource);
const getAllPermissionsUseCase = new GetAllPermissionsUseCase(rbacRepository);
const getUserPermissionsUseCase = new GetUserPermissionsUseCase(rbacRepository);
const rbacController = new RbacController(getAllPermissionsUseCase);

const organizationRepository = new OrganizationRepositoryImpl(AppDataSource);

const organizationMemberModule = createOrganizationMemberModule();

const companyProfileModule = createCompanyProfileModule({
  dataSource: AppDataSource,
  organizationRepository,
  contextMiddleware: null,
});

const workspaceSettingsModule = createWorkspaceSettingsModule({
  dataSource: AppDataSource,
});

const workspaceApiKeysModule = createWorkspaceApiKeysModule({
  dataSource: AppDataSource,
});

const platformApiKeysModule = createPlatformApiKeysModule({
  dataSource: AppDataSource,
});

const platformConfigModule = createPlatformConfigModule({
  dataSource: AppDataSource,
});

const platformBrandingModule = createPlatformBrandingModule({
  platformConfigRepository: platformConfigModule.platformConfigRepository,
});

const embeddingProviderFactory = createEmbeddingProviderFactory({
  getPlatformConfigUseCase: platformConfigModule.getPlatformConfigUseCase,
});

const emailService = createEmailService({
  getPlatformConfigUseCase: platformConfigModule.getPlatformConfigUseCase,
});

const aiProviderFactory = createAIProviderFactory({
  getPlatformApiKeyValueUseCase:
    platformApiKeysModule.getPlatformApiKeyValueUseCase,

  getPlatformConfigUseCase: platformConfigModule.getPlatformConfigUseCase,
});

const ttsProviderFactory = createTTSProviderFactory({
  getPlatformConfigUseCase: platformConfigModule.getPlatformConfigUseCase,
});

const synthesizeSpeechUseCase = new SynthesizeSpeechUseCase({
  ttsProviderFactory,
});

const ttsModule = createTTSModule({
  synthesizeSpeechUseCase,
});

const uploadModule = createUploadModule({
  dataSource: AppDataSource,
});

const ollamaProvider = aiProviderFactory.getProviderByName("ollama");

const aiSettingsModule = createAISettingsModule({
  dataSource: AppDataSource,
});

export const organizationModelEntitlementService =
  new OrganizationModelEntitlementService({
    dataSource: AppDataSource,
  });

const organizationModelAccessModule = createOrganizationModelAccessModule({
  dataSource: AppDataSource,
  organizationModelEntitlementService,
});

const organizationFeatureAccessModule = createOrganizationFeatureAccessModule({
  dataSource: AppDataSource,
});

const organizationInvitationModule = createOrganizationInvitationModule({
  dataSource: AppDataSource,
  organizationRepository,
  organizationMemberRepository:
    organizationMemberModule.organizationMemberRepository,
  userRepository,
  passwordService,
  rbacRepository,
});

const organizationModule = createOrganizationModule({
  companyProfileRepository: companyProfileModule.companyProfileRepository,
  workspaceSettingsRepository:
    workspaceSettingsModule.workspaceSettingsRepository,
  userRepository,
  emailService,
  uploadFileUseCase: uploadModule.uploadFileUseCase,
  organizationInvitationRepository:
    organizationInvitationModule.organizationInvitationRepository,
  organizationInvitationPermissionRepository:
    organizationInvitationModule.organizationInvitationPermissionRepository,
  organizationModelEntitlementService,
});

const workspaceMemberModule = createWorkspaceMemberModule({
  dataSource: AppDataSource,
  userRepository,
  organizationRepository: organizationModule.organizationRepository,
  organizationMemberRepository:
    organizationMemberModule.organizationMemberRepository,
  organizationInvitationRepository:
    organizationInvitationModule.organizationInvitationRepository,
  organizationInvitationPermissionRepository:
    organizationInvitationModule.organizationInvitationPermissionRepository,
  contextMiddleware: null,
  emailService,
});

const workspaceModelModule = createWorkspaceModelModule({
  dataSource: AppDataSource,
  contextMiddleware: null,
  organizationModelEntitlementService,
});

const projectMemberModule = createProjectMemberModule({
  projectRepository,
  projectMemberRepository,
  organizationMemberRepository:
    organizationMemberModule.organizationMemberRepository,
});

const knowledgeModule = createKnowledgeModule({
  dataSource: AppDataSource,
  checkProjectAccessUseCase: projectMemberModule.checkProjectAccessUseCase,
  aiModelRepository: aiModelModule.aiModelRepository,
  getPlatformConfigUseCase: platformConfigModule.getPlatformConfigUseCase,
  embeddingProviderFactory,
});

const projectModule = createProjectModule({
  dataSource: AppDataSource,
  projectRepository,
  organizationRepository: organizationModule.organizationRepository,
  organizationMemberRepository:
    organizationMemberModule.organizationMemberRepository,
  projectMemberRepository: projectMemberModule.projectMemberRepository,
  checkProjectAccessUseCase: projectMemberModule.checkProjectAccessUseCase,
});

const agentModule = createAgentModule({
  dataSource: AppDataSource,
  projectRepository,
  checkProjectAccessUseCase: projectMemberModule.checkProjectAccessUseCase,
  organizationModelAccessRepository:
    organizationModelAccessModule.organizationModelAccessRepository,
  organizationMemberRepository:
    organizationMemberModule.organizationMemberRepository,
  organizationModelEntitlementService,
});

const whatsappModule = createWhatsappModule({
  dataSource: AppDataSource,
  projectRepository,
  agentRepository: agentModule.agentRepository,
  organizationMemberRepository:
    organizationMemberModule.organizationMemberRepository,
  enquiryNotificationRecipientRepository:
    organizationMemberModule.enquiryNotificationRecipientRepository,
  userRepository: organizationMemberModule.userRepository,
  organizationFeatureAccessRepository:
    organizationFeatureAccessModule.organizationFeatureAccessRepository,
});

const pdfInvoiceGenerator = new PdfInvoiceGenerator();
export const invoiceService = new InvoiceService({
  dataSource: AppDataSource,
  pdfInvoiceGenerator,
  evolutionWhatsappProvider: whatsappModule.evolutionWhatsappProvider,
  whatsappConnectionRepository: whatsappModule.whatsappConnectionRepository,
});

const planModule = createPlansModule({
  dataSource: AppDataSource,
  invoiceService,
  organizationModelEntitlementService,
});

export const webhookModule = createWebhookModule({
  dataSource: AppDataSource,
  authenticateJwt: null,
});

const leadModule = createLeadModule({
  dataSource: AppDataSource,
  agentRepository: agentModule.agentRepository,
  conversationRepository,
  projectRepository,
  sendLeadToWhatsappUseCase: whatsappModule.sendLeadToWhatsappUseCase,
  webhookDispatcherService: webhookModule.webhookDispatcherService,
});

const agentToolModule = createAgentToolModule({
  agentRepository: agentModule.agentRepository,
  agentToolRepository,
  workspaceApiKeyRepository: workspaceApiKeysModule.workspaceApiKeyRepository,
  encryptionService: workspaceApiKeysModule.encryptionService,
  projectRepository,
  checkProjectAccessUseCase: projectMemberModule.checkProjectAccessUseCase,
  captureLeadUseCase: leadModule.captureLeadUseCase,
});

const publicChatModule = createPublicChatModule({
  agentRepository: agentModule.agentRepository,
  getPublicOrganizationUseCase: organizationModule.getPublicOrganizationUseCase,
  checkPlanUsageUseCase: planModule.checkPlanUsageUseCase,
});

const profileModule = createProfileModule({
  userRepository,
  organizationRepository: organizationModule.organizationRepository,
  organizationMemberRepository:
    organizationMemberModule.organizationMemberRepository,
  projectRepository,
  projectMemberRepository,
  workspaceMemberPermissionRepository:
    workspaceMemberModule.workspaceMemberPermissionRepository,
  rbacRepository,
  uploadRepository: uploadModule.uploadRepository,
  uploadFileUseCase: uploadModule.uploadFileUseCase,
});

const adminAuthModule = createAdminAuthModule({
  dataSource: AppDataSource,
  jwtService,
  passwordService,
  organizationMemberRepository:
    organizationMemberModule.organizationMemberRepository,
  organizationRepository: organizationModule.organizationRepository,
  workspaceMemberPermissionRepository:
    workspaceMemberModule.workspaceMemberPermissionRepository,
  rbacRepository,
  getPlatformConfigUseCase: platformConfigModule.getPlatformConfigUseCase,
  tokenHashService,
});

const adminModule = createAdminModule({
  dataSource: AppDataSource,
  userRepository,
  createAdminUseCase: adminAuthModule.createAdminUseCase,
  getUserPermissionsUseCase,
  ollamaProvider,
});

const contextModule = createContextModule({
  dataSource: AppDataSource,
  userRepository,
  organizationRepository: organizationModule.organizationRepository,
  projectRepository,
  agentRepository: agentModule.agentRepository,
  organizationMemberRepository:
    organizationMemberModule.organizationMemberRepository,
  projectMemberRepository: projectMemberModule.projectMemberRepository,
  getUserPermissionsUseCase,
  jwtService,
  rbacRepository,
});

const workspaceDashboardModule = createWorkspaceDashboardModule({
  organizationRepository: organizationModule.organizationRepository,
  projectRepository,
  organizationMemberRepository:
    organizationMemberModule.organizationMemberRepository,
  agentRepository: agentModule.agentRepository,
  conversationRepository,
  requireWorkspaceAccess: contextModule.middlewares.workspaceContextMiddleware,
});

const analyticsModule = createAnalyticsModule();

organizationModule.createOrganizationUseCase.organizationInvitationRepository =
  organizationInvitationModule.organizationInvitationRepository;

companyProfileModule.contextMiddleware =
  contextModule.middlewares.workspaceContextMiddleware;

workspaceSettingsModule.contextMiddleware =
  contextModule.middlewares.workspaceContextMiddleware;

workspaceMemberModule.contextMiddleware =
  contextModule.middlewares.workspaceContextMiddleware;

workspaceModelModule.contextMiddleware =
  contextModule.middlewares.workspaceContextMiddleware;

const aiContextService = new AIContextService({
  userRepository,
  agentRepository: agentModule.agentRepository,
  projectRepository,
  projectMemberRepository: projectMemberModule.projectMemberRepository,
  organizationRepository: organizationModule.organizationRepository,
  organizationAISettingsRepository: aiSettingsModule.aiSettingsRepository,
  checkProjectAccessUseCase: projectMemberModule.checkProjectAccessUseCase,
  promptBuilder,
});

const workspaceBrandingModule = createWorkspaceBrandingModule({
  organizationRepository: organizationModule.organizationRepository,
});

const paymentModule = createPaymentModule({
  dataSource: AppDataSource,
  planRepository: planModule.planRepository,
  entitlementService: planModule.entitlementService,
  getPlatformConfigUseCase: platformConfigModule.getPlatformConfigUseCase,
  invoiceService,
});

export const authService = new AuthService({
  userRepository,
  getUserPermissionsUseCase,
  organizationMemberRepository:
    organizationMemberModule.organizationMemberRepository,
  organizationRepository: organizationModule.organizationRepository,
  jwtService,
});

export const modelCostCalculatorService = new ModelCostCalculatorService();
export const budgetCapGuardService = new BudgetCapGuardService({
  usageRepository,
  workspaceSettingsRepository:
    workspaceSettingsModule.workspaceSettingsRepository,
});
export const getTokenUsageAnalyticsUseCase = new GetTokenUsageAnalyticsUseCase({
  usageRepository,
  workspaceSettingsRepository:
    workspaceSettingsModule.workspaceSettingsRepository,
});

export const conversationService = new ConversationService({
  conversationRepository,
  messageRepository,
  usageRepository,
  agentRepository: agentModule.agentRepository,
  aiProviderFactory,
  aiContextService,
  checkProjectAccessUseCase: projectMemberModule.checkProjectAccessUseCase,
  checkPlanUsageUseCase: planModule.checkPlanUsageUseCase,
  knowledgeSearchService: knowledgeModule.knowledgeSearchService,
  agentToolRepository: agentToolModule.agentToolRepository,
  agentToolSchemaService: agentToolModule.agentToolSchemaService,
  agentToolExecutorService: agentToolModule.agentToolExecutorService,
  agentToolResolverService: agentToolModule.agentToolResolverService,
  getPlatformConfigUseCase: platformConfigModule.getPlatformConfigUseCase,
  organizationModelAccessRepository:
    organizationModelAccessModule.organizationModelAccessRepository,
  organizationModelEntitlementService,
  modelCostCalculatorService,
  budgetCapGuardService,
  webhookDispatcherService: webhookModule.webhookDispatcherService,
  whatsappConnectionRepository: whatsappModule.whatsappConnectionRepository,
  whatsappProvider: whatsappModule.evolutionWhatsappProvider,
  companyProfileRepository: companyProfileModule.companyProfileRepository,
  sendHandoverNotificationToWhatsappUseCase:
    whatsappModule.sendHandoverNotificationToWhatsappUseCase,
});

whatsappModule.handleEvolutionWebhookUseCase.conversationRepository =
  conversationRepository;
whatsappModule.handleEvolutionWebhookUseCase.messageRepository =
  messageRepository;
whatsappModule.handleEvolutionWebhookUseCase.conversationService =
  conversationService;
whatsappModule.handleEvolutionWebhookUseCase.whatsappProvider =
  whatsappModule.evolutionWhatsappProvider;
whatsappModule.handleEvolutionWebhookUseCase.agentRepository =
  agentModule.agentRepository;

const aiVideoModule = createAiVideoModule({
  dataSource: AppDataSource,
  aiProviderFactory,
  synthesizeSpeechUseCase,
  getPlatformApiKeyValueUseCase: platformApiKeysModule.getPlatformApiKeyValueUseCase,
  checkPlanUsageUseCase: planModule.checkPlanUsageUseCase,
  storageProvider: uploadModule.storageProvider,
  uploadFileUseCase: uploadModule.uploadFileUseCase,
});

export {
  userRepository,
  aiModelModule,
  tokenHashService,
  rbacRepository,
  rbacController,
  organizationModelAccessModule,
  organizationFeatureAccessModule,
  organizationModule,
  organizationInvitationModule,
  organizationMemberModule,
  aiSettingsModule,
  projectModule,
  projectMemberModule,
  agentModule,
  agentToolModule,
  knowledgeModule,
  profileModule,
  adminModule,
  adminAuthModule,
  contextModule,
  companyProfileModule,
  workspaceSettingsModule,
  workspaceApiKeysModule,
  platformApiKeysModule,
  platformConfigModule,
  platformBrandingModule,
  workspaceMemberModule,
  workspaceDashboardModule,
  workspaceModelModule,
  publicChatModule,
  uploadModule,
  workspaceBrandingModule,
  analyticsModule,
  getAgentUsageSummaryUseCase,
  usageRepository,
  planModule,
  paymentModule,
  ttsModule,
  whatsappModule,
  leadModule,
  aiVideoModule,
};
