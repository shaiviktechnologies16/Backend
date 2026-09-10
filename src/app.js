import express from "express";
import helmet from "helmet";
import cors from "cors";
import { configureCorsPolicy } from "./config/cors.config.js";
import { sanitizeRequestBodyMiddleware } from "./common/middleware/sanitize-input.middleware.js";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes, {
  createAuthRoutes,
} from "./features/auth/routes/auth.routes.js";
import { createCaptchaMiddleware } from "./common/middleware/captcha.middleware.js";
import createChatRoutes from "./features/chat/routes/chat.routes.js";
import createProjectRoutes from "./features/project/presentation/routes/project.routes.js";
import createOrganizationRoutes from "./features/organization/presentation/routes/organization.routes.js";
import createOrganizationMemberRoutes from "./features/organization-member/presentation/routes/organization-member.routes.js";
import createAgentRoutes from "./features/agent/presentation/routes/agent.routes.js";
import createProfileRoutes from "./features/profile/presentation/routes/profile.routes.js";
import createAdminRoutes from "./features/admin/presentation/routes/admin.routes.js";
import { createAdminAuthRoutes } from "./features/admin/admin-auth/presentation/routes/admin-auth.routes.js";
import { authenticate } from "./common/middleware/auth.middleware.js";
import createOrganizationInvitationRoutes from "./features/organization-invitations/presentation/routes/organization-invitation.routes.js";
import { requirePlatformRole } from "./features/admin/presentation/middleware/require-platform-role.middleware.js";
import { PlatformRole } from "./features/admin/domain/constants/platform-role.js";
import { createContextTestRoutes } from "./features/shared/context/presentation/routes/context-test.routes.js";
import { createCompanyProfileRoutes } from "./features/workspace/company/presentation/routes/company-profile.routes.js";
import { createWorkspaceSettingsRoutes } from "./features/workspace/settings/presentation/routes/workspace-settings.routes.js";
import { createWorkspaceMemberRoutes } from "./features/workspace/members/presentation/routes/workspace-member.routes.js";
import createPublicChatRoutes from "./features/public-chat/routes/public-chat.routes.js";
import { createWorkspaceDashboardRoutes } from "./features/workspace/dashboard/presentation/routes/workspace-dashboard.routes.js";
import { createWorkspaceModelRoutes } from "./features/workspace/models/presentation/routes/workspace-model.routes.js";
import { createAISettingsRoutes } from "./features/organization/ai-settings/presentation/routes/ai-settings.routes.js";
import { createAIModelRoutes } from "./features/platform/ai-models/presentation/routes/ai-model.routes.js";
import { createOrganizationModelAccessRoutes } from "./features/platform/organization-model-access/presentation/routes/organization-model-access.routes.js";
import createKnowledgeSourceRoutes from "./features/knowledge/presentation/routes/knowledge-source.routes.js";
import createUploadRoutes from "./features/upload/presentation/routes/upload.routes.js";
import createPlatformUploadRoutes from "./features/upload/presentation/routes/platform-upload.routes.js";
import createAgentToolRoutes from "./features/agent-tool/presentation/routes/agent-tool.routes.js";
import createProjectMemberRoutes from "./features/project-member/presentation/routes/project-member.routes.js";
import { createWorkspaceApiKeyRoutes } from "./features/workspace/api-keys/presentation/routes/workspace-api-key.routes.js";
import { createPlatformApiKeyRoutes } from "./features/platform/api-keys/presentation/routes/platform-api-key.routes.js";
import { createPlatformConfigRoutes } from "./features/platform/config/presentation/routes/platform-config.routes.js";
import createPublicConfigRoutes from "./features/public-config/presentation/routes/public-config.routes.js";
import { PublicConfigController } from "./features/public-config/presentation/controllers/public-config.controller.js";
import createPlatformBrandingRoutes from "./features/platform/branding/presentation/routes/platform-branding.routes.js";
import createWorkspaceBrandingRoutes from "./features/workspace/branding/presentation/routes/workspace-branding.routes.js";
import createRbacRoutes from "./features/rbac/presentation/routes/rbac.routes.js";
import { RbacController } from "./features/rbac/presentation/controllers/rbac.controller.js";
import createAnalyticsRoutes from "./features/analytics/presentation/routes/analytics.routes.js";
import { createPlanRoutes } from "./features/platform/plans/presentation/routes/plan.routes.js";
import { createPaymentRoutes } from "./features/payment/presentation/routes/payment.routes.js";
import createTTSRoutes from "./features/tts/routes/tts.routes.js";
import createWhatsappConnectionRoutes from "./features/whatsapp/presentation/routes/whatsapp-connection.routes.js";
import createPlatformWhatsappRoutes from "./features/whatsapp/presentation/routes/platform-whatsapp.routes.js";
import { createOrganizationFeatureAccessRoutes } from "./features/platform/organization-feature-access/presentation/routes/organization-feature-access.routes.js";
import { createWorkspaceFeatureAccessRoutes } from "./features/platform/organization-feature-access/presentation/routes/workspace-feature-access.routes.js";
import { createPublicEnquiryRoutes } from "./features/lead/presentation/routes/public-enquiry.routes.js";
import { createOrganizationEnquiriesRoutes } from "./features/lead/presentation/routes/organization-enquiries.routes.js";
import {
  userRepository,
  jwtService,
  organizationModule,
  organizationMemberModule,
  organizationInvitationModule,
  projectMemberModule,
  projectModule,
  agentModule,
  agentToolModule,
  profileModule,
  adminModule,
  adminAuthModule,
  rbacRepository,
  aiModelModule,
  organizationModelAccessModule,
  organizationFeatureAccessModule,
  aiSettingsModule,
  contextModule,
  companyProfileModule,
  workspaceSettingsModule,
  workspaceApiKeysModule,
  workspaceMemberModule,
  platformApiKeysModule,
  platformConfigModule,
  platformBrandingModule,
  workspaceDashboardModule,
  workspaceModelModule,
  publicChatModule,
  knowledgeModule,
  uploadModule,
  workspaceBrandingModule,
  rbacController,
  analyticsModule,
  planModule,
  paymentModule,
  ttsModule,
  whatsappModule,
  leadModule,
} from "./container/services.js";
import { errorMiddleware } from "./common/middleware/error.middleware.js";
import { createEntitlementMiddleware } from "./common/middleware/entitlement.middleware.js";

const app = express();

const authMiddleware = authenticate(userRepository, jwtService);
const entitlementMiddleware = createEntitlementMiddleware(
  planModule.entitlementService,
);

app.use(configureCorsPolicy());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(express.json());
app.use(sanitizeRequestBodyMiddleware);

app.use(
  "/api/v1/payments",
  createPaymentRoutes({
    paymentController: paymentModule.paymentController,
    authMiddleware,
  }),
);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
  });
});

app.get("/api/test/company-services", (req, res) => {
  res.json({
    success: true,
    data: {
      services: [
        "Mobile App Development",
        "Website Development",
        "UI/UX Design",
        "AI Solutions",
        "Cloud Services",
        "Digital Marketing",
      ],
    },
  });
});

app.use(
  "/api/v1/public/config",
  createPublicConfigRoutes({
    publicConfigController: new PublicConfigController({
      getPlatformConfigUseCase: platformConfigModule.getPlatformConfigUseCase,
    }),
  }),
);

app.use(
  "/api/v1/public/enquiries",
  createPublicEnquiryRoutes({
    publicEnquiryController: leadModule.publicEnquiryController,
  }),
);

app.use(
  "/api/v1/platform/branding",
  createPlatformBrandingRoutes({
    controller: platformBrandingModule.platformBrandingController,

    middleware: [authMiddleware],
  }),
);

app.use(
  "/api/v1/platform/plans",
  createPlanRoutes({
    planController: planModule.planController,
    middleware: [
      authMiddleware,
      requirePlatformRole(adminModule.requirePlatformRoleUseCase, [
        PlatformRole.PLATFORM_ADMIN,
        PlatformRole.PLATFORM_MANAGER,
      ]),
    ],
  }),
);

app.use(
  "/api/v1/workspace/branding",
  createWorkspaceBrandingRoutes({
    controller: workspaceBrandingModule.workspaceBrandingController,
    authMiddleware,
    workspaceContextMiddleware:
      contextModule.middlewares.workspaceContextMiddleware,
  }),
);

app.use(
  "/api/v1/platform/ai-models",
  createAIModelRoutes({
    aiModelController: aiModelModule.aiModelController,
    middleware: [
      authMiddleware,
      requirePlatformRole(adminModule.requirePlatformRoleUseCase, [
        PlatformRole.PLATFORM_ADMIN,
        PlatformRole.PLATFORM_MANAGER,
      ]),
    ],
  }),
);

app.use(
  "/api/v1/platform/organization-model-access",
  createOrganizationModelAccessRoutes({
    organizationModelAccessController:
      organizationModelAccessModule.organizationModelAccessController,
    middleware: [
      authMiddleware,
      requirePlatformRole(adminModule.requirePlatformRoleUseCase, [
        PlatformRole.PLATFORM_ADMIN,
        PlatformRole.PLATFORM_MANAGER,
      ]),
    ],
  }),
);

app.use(
  "/api/v1/platform/organization-feature-access",
  createOrganizationFeatureAccessRoutes({
    organizationFeatureAccessController:
      organizationFeatureAccessModule.organizationFeatureAccessController,
  }),
);

app.use(
  "/api/v1/workspace/feature-access",
  createWorkspaceFeatureAccessRoutes({
    workspaceFeatureAccessController:
      organizationFeatureAccessModule.workspaceFeatureAccessController,
    authMiddleware,
    organizationContextMiddleware:
      contextModule.middlewares.organizationContextMiddleware,
  }),
);

app.use(
  "/api/v1/platform/api-keys",
  createPlatformApiKeyRoutes({
    platformApiKeyController: platformApiKeysModule.platformApiKeyController,
    middleware: [
      authMiddleware,
      requirePlatformRole(adminModule.requirePlatformRoleUseCase, [
        PlatformRole.PLATFORM_ADMIN,
        PlatformRole.PLATFORM_MANAGER,
      ]),
    ],
  }),
);

app.use(
  "/api/v1/platform/config",
  createPlatformConfigRoutes({
    platformConfigController: platformConfigModule.platformConfigController,
    middleware: [
      authMiddleware,
      requirePlatformRole(adminModule.requirePlatformRoleUseCase, [
        PlatformRole.PLATFORM_ADMIN,
        PlatformRole.PLATFORM_MANAGER,
      ]),
    ],
  }),
);

app.use(
  "/api/v1/platform/uploads",
  createPlatformUploadRoutes({
    uploadController: uploadModule.uploadController,
    middleware: [
      authMiddleware,
      requirePlatformRole(adminModule.requirePlatformRoleUseCase, [
        PlatformRole.PLATFORM_ADMIN,
        PlatformRole.PLATFORM_MANAGER,
      ]),
    ],
  }),
);

app.use(
  "/api/v1/tts",
  createTTSRoutes({
    controller: ttsModule.controller,
    jobController: ttsModule.jobController,
    middleware: [authMiddleware],
  }),
);

app.use(
  "/api/v1/context-test",
  createContextTestRoutes({
    middlewares: contextModule.middlewares,
  }),
);

app.use(
  "/api/v1/workspace/company",
  createCompanyProfileRoutes({
    companyProfileController: companyProfileModule.companyProfileController,
    middleware: companyProfileModule.contextMiddleware,
  }),
);

app.use(
  "/api/v1/workspace/settings",
  createWorkspaceSettingsRoutes({
    workspaceSettingsController:
      workspaceSettingsModule.workspaceSettingsController,
    middleware: workspaceSettingsModule.contextMiddleware,
  }),
);

app.use(
  "/api/v1/workspace/api-keys",
  createWorkspaceApiKeyRoutes({
    workspaceApiKeyController: workspaceApiKeysModule.workspaceApiKeyController,
    middleware: contextModule.middlewares.workspaceContextMiddleware,
  }),
);
app.use(
  "/api/v1/workspace/models",
  createWorkspaceModelRoutes({
    workspaceModelController: workspaceModelModule.workspaceModelController,
    middleware: workspaceModelModule.contextMiddleware,
  }),
);

const captchaMiddleware = createCaptchaMiddleware({
  getPlatformConfigUseCase: platformConfigModule.getPlatformConfigUseCase,
});

const configuredAuthRoutes = createAuthRoutes({ captchaMiddleware });
app.use("/api/auth", configuredAuthRoutes);
app.use("/api/v1/auth", configuredAuthRoutes);

app.use(
  "/api/v1/admin/auth",
  createAdminAuthRoutes({
    adminAuthController: adminAuthModule.adminAuthController,
    requirePlatformRoleUseCase: adminModule.requirePlatformRoleUseCase,
    userRepository,
    jwtService,
    captchaMiddleware,
  }),
);

app.use(
  "/api/v1/admin",
  createAdminRoutes(
    adminModule.adminController,
    adminModule.userRepository,
    adminModule.getUserPermissionsUseCase,
    jwtService,
    contextModule.workspaceMemberPermissionRepository,
    organizationMemberModule.organizationMemberRepository,
    rbacRepository,
  ),
);

app.use(
  "/api/v1/profile",
  createProfileRoutes({
    profileController: profileModule.profileController,
    authMiddleware,
  }),
);

app.use(
  "/api/chat",
  createChatRoutes({
    middleware: authMiddleware,
  }),
);

app.use(
  "/api/v1/projects",
  createProjectRoutes(
    projectModule.projectController,
    contextModule.middlewares.workspaceContextMiddleware,
    adminModule.getUserPermissionsUseCase,
    contextModule.workspaceMemberPermissionRepository,
    organizationMemberModule.organizationMemberRepository,
    rbacRepository,
    entitlementMiddleware,
  ),
);

app.use(
  "/api/v1/project-members",
  createProjectMemberRoutes(projectMemberModule.projectMemberController),
);

app.use(
  "/api/v1/agent-tools",
  createAgentToolRoutes(agentToolModule.agentToolController, authMiddleware),
);

app.use(
  "/api/v1/agents",
  createAgentRoutes(
    agentModule.agentController,
    authMiddleware,
    contextModule.middlewares.workspaceContextMiddleware,
    adminModule.getUserPermissionsUseCase,
    contextModule.workspaceMemberPermissionRepository,
    organizationMemberModule.organizationMemberRepository,
    rbacRepository,
    entitlementMiddleware,
  ),
);

app.use(
  "/api/v1/whatsapp-connections",
  createWhatsappConnectionRoutes(
    whatsappModule.whatsappConnectionController,
    authMiddleware,
    contextModule.middlewares.workspaceContextMiddleware,
    adminModule.getUserPermissionsUseCase,
    contextModule.workspaceMemberPermissionRepository,
    organizationMemberModule.organizationMemberRepository,
    rbacRepository,
    organizationFeatureAccessModule.organizationFeatureAccessRepository,
    entitlementMiddleware,
  ),
);

app.use(
  "/api/v1/platform/whatsapp",
  createPlatformWhatsappRoutes({
    controller: whatsappModule.platformWhatsappController,
    middleware: [
      authMiddleware,
      requirePlatformRole(adminModule.requirePlatformRoleUseCase, [
        PlatformRole.PLATFORM_ADMIN,
        PlatformRole.PLATFORM_MANAGER,
      ]),
    ],
  }),
);

app.use(
  "/api/v1/projects/:projectId/knowledge",
  createKnowledgeSourceRoutes(
    knowledgeModule.knowledgeSourceController,
    authMiddleware,
    contextModule.middlewares.workspaceContextMiddleware,
    adminModule.getUserPermissionsUseCase,
    contextModule.workspaceMemberPermissionRepository,
    organizationMemberModule.organizationMemberRepository,
    rbacRepository,
    entitlementMiddleware,
  ),
);

app.use(
  "/api/v1/projects/:projectId/uploads",
  createUploadRoutes({
    uploadController: uploadModule.uploadController,
    workspaceContextMiddleware:
      contextModule.middlewares.workspaceContextMiddleware,
    getUserPermissionsUseCase: adminModule.getUserPermissionsUseCase,
    workspaceMemberPermissionRepository:
      contextModule.workspaceMemberPermissionRepository,
    organizationMemberRepository:
      organizationMemberModule.organizationMemberRepository,
    rbacRepository,
  }),
);

app.use(
  "/api/v1/organizations",
  createOrganizationRoutes(
    organizationModule.organizationController,
    authMiddleware,
  ),
);

app.use(
  "/api/v1/organizations",
  createOrganizationEnquiriesRoutes({
    getOrganizationEnquiriesController:
      leadModule.getOrganizationEnquiriesController,
    updateLeadStatusController: leadModule.updateLeadStatusController,
  }),
);

app.use(
  "/api/v1/organization-invitations",
  createOrganizationInvitationRoutes(
    organizationInvitationModule.organizationInvitationController,
    authMiddleware,
    entitlementMiddleware,
  ),
);

app.use(
  "/api/v1/organization-members",
  createOrganizationMemberRoutes(
    organizationMemberModule.organizationMemberController,
    authMiddleware,
    entitlementMiddleware,
  ),
);

app.use(
  "/api/v1/organizations",
  createAISettingsRoutes({
    aiSettingsController: aiSettingsModule.aiSettingsController,
    middleware: authMiddleware,
  }),
);

app.use(
  "/api/v1/workspace/members",
  createWorkspaceMemberRoutes({
    workspaceMemberController: workspaceMemberModule.workspaceMemberController,
    middleware: workspaceMemberModule.contextMiddleware,
    entitlementMiddleware,
  }),
);

app.use(
  "/api/v1/workspace/dashboard",
  createWorkspaceDashboardRoutes({
    workspaceDashboardController:
      workspaceDashboardModule.workspaceDashboardController,
    middleware: workspaceDashboardModule.contextMiddleware,
  }),
);

app.use(
  "/api/public/chat",
  createPublicChatRoutes({
    controller: publicChatModule.publicChatController,
  }),
);
app.use(
  "/api/v1/analytics",
  createAnalyticsRoutes({
    analyticsController: analyticsModule.analyticsController,
    authMiddleware,
    getUserPermissionsUseCase: adminModule.getUserPermissionsUseCase,
    workspaceMemberPermissionRepository:
      contextModule.workspaceMemberPermissionRepository,
    organizationMemberRepository:
      organizationMemberModule.organizationMemberRepository,
    rbacRepository,
  }),
);

app.use("/api/v1/rbac", createRbacRoutes(rbacController, authMiddleware));
app.use(errorMiddleware);
export default app;
