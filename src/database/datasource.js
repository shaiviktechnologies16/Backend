import path from "path";
import { fileURLToPath } from "url";
import "reflect-metadata";
import fs from "fs";
import envConfig from "../config/env.config.js";
import { DataSource } from "typeorm";
import { UserOrm } from "./entities/user.orm.js";
import { RoleOrm } from "./entities/role.orm.js";
import { PermissionOrm } from "./entities/permission.orm.js";
import { RolePermissionOrm } from "./entities/role-permission.orm.js";
import { UserPermissionOrm } from "./entities/user-permission.orm.js";
import { OrganizationOrmEntity } from "../features/organization/infrastructure/database/organization.orm-entity.js";
import { OrganizationMemberOrmEntity } from "../features/organization-member/infrastructure/database/organization-member.orm-entity.js";
import { OrganizationInvitationOrm } from "./entities/organization-invitation.orm.js";
import { ProjectOrmEntity } from "../features/project/infrastructure/database/project.orm-entity.js";
import { ProjectMemberOrmEntity } from "../features/project-member/infrastructure/database/project-member.orm-entity.js";
import { AgentOrmEntity } from "../features/agent/infrastructure/database/agent.orm-entity.js";
import { ConversationOrm } from "./entities/conversation.orm.js";
import { MessageOrm } from "./entities/message.orm.js";
import { AISettingsOrmEntity } from "../features/organization/ai-settings/infrastructure/database/ai-settings.orm-entity.js";
import { AIModelOrmEntity } from "../features/platform/ai-models/infrastructure/database/ai-model.orm-entity.js";
import { OrganizationModelAccessOrmEntity } from "../features/platform/ai-models/infrastructure/database/organization-model-access.orm-entity.js";
import { CompanyProfileOrmEntity } from "../features/workspace/company/infrastructure/database/company-profile.orm-entity.js";
import { WorkspaceSettingsOrmEntity } from "../features/workspace/settings/infrastructure/database/workspace-settings.orm-entity.js";
import { WorkspaceMemberOrmEntity } from "../features/workspace/members/infrastructure/database/workspace-member.orm-entity.js";
import { AdminSessionOrm } from "../features/admin/admin-auth/infrastructure/database/admin-session.orm.js";
import { KnowledgeSourceOrmEntity } from "../features/knowledge/infrastructure/database/knowledge-source.orm-entity.js";
import { KnowledgeChunkOrmEntity } from "../features/knowledge/infrastructure/database/knowledge-chunk.orm-entity.js";
import { UploadOrmEntity } from "../features/upload/infrastructure/database/upload.orm-entity.js";
import { AgentToolOrmEntity } from "../features/agent-tool/infrastructure/database/agent-tool.orm-entity.js";
import { LeadOrmEntity } from "../features/lead/infrastructure/database/lead.orm-entity.js";
import { WorkspaceApiKeyOrmEntity } from "../features/workspace/api-keys/infrastructure/database/workspace-api-key.orm-entity.js";
import { PlatformApiKeyOrmEntity } from "../features/platform/api-keys/infrastructure/database/platform-api-key.orm-entity.js";
import { PlatformConfigOrmEntity } from "../features/platform/config/infrastructure/database/platform-config.orm-entity.js";
import { UsageOrm } from "./entities/usage.orm.js";
import { PlanOrmEntity } from "../features/platform/plans/infrastructure/database/plan.orm-entity.js";
import { PlanUsageLimitOrmEntity } from "../features/platform/plans/infrastructure/database/plan-usage-limit.orm-entity.js";
import { PlanFeatureOrmEntity } from "../features/platform/plans/infrastructure/database/plan-feature.orm-entity.js";
import { SubscriptionOrmEntity } from "../features/platform/plans/infrastructure/database/subscription.orm-entity.js";
import { TtsJobOrm } from "../features/tts/domain/entities/tts-job.entity.js";
import { WhatsappConnectionOrmEntity } from "../features/whatsapp/infrastructure/database/whatsapp-connection.orm-entity.js";
import { EnquiryNotificationRecipientOrmEntity } from "../features/organization-member/infrastructure/database/enquiry-notification-recipient.orm-entity.js";
import { PlatformWhatsappConnectionOrmEntity } from "../features/whatsapp/infrastructure/database/platform-whatsapp-connection.orm-entity.js";
import { OrganizationFeatureAccessOrmEntity } from "../features/platform/organization-feature-access/infrastructure/database/organization-feature-access.orm-entity.js";
import { PaymentOrderOrmEntity } from "../features/payment/infrastructure/database/payment-order.orm-entity.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseSsl = envConfig.database.ssl
  ? {
      rejectUnauthorized: true,
      ...(envConfig.database.sslCa ? { ca: envConfig.database.sslCa } : {}),
      ...(envConfig.database.sslCaFile
        ? {
            ca: fs.readFileSync(envConfig.database.sslCaFile, "utf8"),
          }
        : {}),
    }
  : false;

export const AppDataSource = new DataSource({
  type: "postgres",
  host: envConfig.database.host,
  port: envConfig.database.port,
  username: envConfig.database.username,
  password: envConfig.database.password,
  database: envConfig.database.database,
  ssl: databaseSsl,
  synchronize: false,
  logging: true,

  entities: [
    UserOrm,
    RoleOrm,
    PermissionOrm,
    RolePermissionOrm,
    UserPermissionOrm,
    PlanOrmEntity,
    PlanUsageLimitOrmEntity,
    PlanFeatureOrmEntity,
    SubscriptionOrmEntity,
    PaymentOrderOrmEntity,
    OrganizationOrmEntity,
    OrganizationMemberOrmEntity,
    OrganizationInvitationOrm,
    ProjectOrmEntity,
    ProjectMemberOrmEntity,
    AgentOrmEntity,
    AgentToolOrmEntity,
    LeadOrmEntity,
    ConversationOrm,
    MessageOrm,
    AISettingsOrmEntity,
    AIModelOrmEntity,
    OrganizationModelAccessOrmEntity,
    CompanyProfileOrmEntity,
    WorkspaceSettingsOrmEntity,
    WorkspaceMemberOrmEntity,
    WorkspaceApiKeyOrmEntity,
    PlatformApiKeyOrmEntity,
    PlatformConfigOrmEntity,
    UsageOrm,
    AdminSessionOrm,
    KnowledgeSourceOrmEntity,
    KnowledgeChunkOrmEntity,
    UploadOrmEntity,
    TtsJobOrm,
    WhatsappConnectionOrmEntity,
    PlatformWhatsappConnectionOrmEntity,
    EnquiryNotificationRecipientOrmEntity,
    OrganizationFeatureAccessOrmEntity,
  ],

  migrations: [path.join(__dirname, "migrations/*.js")],
});
