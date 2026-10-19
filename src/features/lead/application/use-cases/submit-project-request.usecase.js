import { AppError } from "../../../../common/errors/AppError.js";
import { ProjectEntity } from "../../../project/domain/entities/project.entity.js";
import { ProjectMember } from "../../../project-member/domain/entities/project-member.entity.js";
import { ProjectMemberRole } from "../../../project-member/domain/constants/project-member-role.js";
import { ProjectStatus } from "../../../project/domain/constants/project-status.js";
import { Lead } from "../../domain/entities/lead.entity.js";

const DEFAULT_ORGANIZATION_ID = "5e62e09b-8bf7-41ab-a13c-e0bfa70e0192";

export class SubmitProjectRequestUseCase {
  constructor({
    projectRepository,
    projectMemberRepository,
    organizationRepository,
    organizationMemberRepository,
    leadRepository,
    sendLeadToWhatsappUseCase,
  }) {
    this.projectRepository = projectRepository;
    this.projectMemberRepository = projectMemberRepository;
    this.organizationRepository = organizationRepository;
    this.organizationMemberRepository = organizationMemberRepository;
    this.leadRepository = leadRepository;
    this.sendLeadToWhatsappUseCase = sendLeadToWhatsappUseCase;
  }

  async execute({
    fullName,
    mobile,
    email = null,
    company = null,
    projectType = null,
    requirements,
    organizationId = null,
  }) {
    // 1. Validation
    const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
    if (!trimmedName) {
      throw new AppError("Full name is required.", 400, "FULL_NAME_REQUIRED");
    }

    const trimmedMobile = typeof mobile === "string" ? mobile.trim() : "";
    if (!trimmedMobile) {
      throw new AppError("Mobile number is required.", 400, "MOBILE_REQUIRED");
    }

    const trimmedRequirements =
      typeof requirements === "string" ? requirements.trim() : "";
    if (!trimmedRequirements) {
      throw new AppError(
        "Project requirements are required.",
        400,
        "REQUIREMENTS_REQUIRED",
      );
    }

    const cleanEmail =
      typeof email === "string" && email.trim().length > 0
        ? email.trim()
        : null;
    const cleanCompany =
      typeof company === "string" && company.trim().length > 0
        ? company.trim()
        : null;
    const cleanProjectType =
      typeof projectType === "string" && projectType.trim().length > 0
        ? projectType.trim()
        : null;

    // 2. Resolve Target Organization
    let targetOrg = null;
    const targetOrgId = organizationId || DEFAULT_ORGANIZATION_ID;

    if (targetOrgId && this.organizationRepository) {
      try {
        targetOrg = await this.organizationRepository.findById(targetOrgId);
      } catch (err) {
        console.warn("[PROJECT_REQUEST_ORG_LOOKUP_FAILED]", err?.message);
      }
    }

    // Fallback: lookup default org if not found yet
    if (!targetOrg && targetOrgId !== DEFAULT_ORGANIZATION_ID && this.organizationRepository) {
      try {
        targetOrg = await this.organizationRepository.findById(
          DEFAULT_ORGANIZATION_ID,
        );
      } catch (err) {
        console.warn("[PROJECT_REQUEST_DEFAULT_ORG_LOOKUP_FAILED]", err?.message);
      }
    }

    if (!targetOrg) {
      throw new AppError(
        "Target organization could not be resolved.",
        500,
        "ORGANIZATION_NOT_FOUND",
      );
    }

    // 3. Resolve Organization Owner / Admin User
    let ownerUserId = targetOrg.ownerId || targetOrg.owner_id || null;

    if (!ownerUserId && this.organizationMemberRepository) {
      try {
        const ownerMember =
          await this.organizationMemberRepository.findOwnerByOrganizationId(
            targetOrg.id,
          );
        if (ownerMember) {
          ownerUserId = ownerMember.userId;
        }
      } catch (err) {
        console.warn("[PROJECT_REQUEST_OWNER_LOOKUP_FAILED]", err?.message);
      }
    }

    if (!ownerUserId) {
      // Fallback: check members
      try {
        const members =
          await this.organizationMemberRepository.findAllByOrganization(
            targetOrg.id,
          );
        if (members && members.length > 0) {
          ownerUserId = members[0].userId;
        }
      } catch (err) {
        console.warn("[PROJECT_REQUEST_MEMBERS_LOOKUP_FAILED]", err?.message);
      }
    }

    if (!ownerUserId) {
      throw new AppError(
        "Organization owner could not be resolved.",
        500,
        "ORGANIZATION_OWNER_NOT_FOUND",
      );
    }

    // 4. Construct Project Name and Description for Workspace Projects
    const projectPrefix = cleanProjectType || "Project Request";
    const projectSuffix = cleanCompany || trimmedName;
    const rawProjectName = `${projectPrefix} - ${projectSuffix}`;
    const projectName =
      rawProjectName.length > 250
        ? rawProjectName.slice(0, 247) + "..."
        : rawProjectName;

    const descLines = [
      `Client: ${trimmedName}`,
      `Phone: ${trimmedMobile}`,
    ];
    if (cleanEmail) descLines.push(`Email: ${cleanEmail}`);
    if (cleanCompany) descLines.push(`Company: ${cleanCompany}`);
    if (cleanProjectType) descLines.push(`Project Type: ${cleanProjectType}`);
    descLines.push("", "Requirements:", trimmedRequirements);

    const projectDescription = descLines.join("\n");

    // 5. Create Project in Workspace
    const projectEntity = new ProjectEntity({
      organizationId: targetOrg.id,
      name: projectName,
      description: projectDescription,
      status: ProjectStatus.ACTIVE,
      createdBy: ownerUserId,
    });

    const createdProject = await this.projectRepository.create(projectEntity);

    // 6. Create Project Member for Owner
    if (this.projectMemberRepository && createdProject?.id) {
      try {
        const projectMember = new ProjectMember({
          projectId: createdProject.id,
          userId: ownerUserId,
          role: ProjectMemberRole.OWNER,
        });
        await this.projectMemberRepository.create(projectMember);
      } catch (err) {
        console.warn(
          "[PROJECT_REQUEST_PROJECT_MEMBER_WARNING]",
          err?.message,
        );
      }
    }

    // 7. Create Lead Record in Leads table
    const leadEntity = new Lead({
      organizationId: targetOrg.id,
      projectId: createdProject.id,
      agentId: null,
      conversationId: null,
      visitorId: null,
      name: trimmedName,
      phone: trimmedMobile,
      email: cleanEmail,
      requirement: trimmedRequirements,
      source: "WEBSITE_PROJECT_REQUEST",
      status: "NEW",
      metadata: {
        company: cleanCompany,
        projectType: cleanProjectType,
        submittedAt: new Date().toISOString(),
        projectId: createdProject.id,
        projectName: createdProject.name,
      },
    });

    let createdLead = null;
    try {
      createdLead = await this.leadRepository.create(leadEntity);
    } catch (err) {
      console.error("[PROJECT_REQUEST_LEAD_CREATE_ERROR]", err?.message);
    }

    // 8. Send WhatsApp Notification via Evolution API
    let whatsapp = null;
    if (this.sendLeadToWhatsappUseCase && (createdLead || leadEntity)) {
      try {
        whatsapp = await this.sendLeadToWhatsappUseCase.execute({
          organizationId: targetOrg.id,
          lead: createdLead || leadEntity,
        });
      } catch (error) {
        console.error("[PROJECT_REQUEST_WHATSAPP_SEND_FAILED]", {
          organizationId: targetOrg.id,
          error: error?.message,
        });
        whatsapp = {
          sent: false,
          error: error.message || "WhatsApp notification failed to send.",
        };
      }
    }

    return {
      project: createdProject,
      lead: createdLead,
      whatsapp,
    };
  }
}

