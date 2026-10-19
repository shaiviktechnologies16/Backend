import test from "node:test";
import assert from "node:assert/strict";
import { SubmitProjectRequestUseCase } from "./submit-project-request.usecase.js";

test("SubmitProjectRequestUseCase successfully creates project, project member, lead, and sends WhatsApp notification", async () => {
  let createdProjectData = null;
  let createdProjectMember = null;
  let createdLeadData = null;
  let sentWhatsappPayload = null;

  const mockProjectRepo = {
    async create(project) {
      createdProjectData = project;
      return {
        ...project,
        id: "proj-new-uuid-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
  };

  const mockProjectMemberRepo = {
    async create(member) {
      createdProjectMember = member;
      return { id: "pm-123", ...member };
    },
  };

  const mockOrgRepo = {
    async findById(id) {
      return {
        id: id || "5e62e09b-8bf7-41ab-a13c-e0bfa70e0192",
        name: "Shaivik Technologies Pvt Ltd",
        ownerId: "user-owner-123",
        status: "ACTIVE",
      };
    },
  };

  const mockOrgMemberRepo = {
    async findOwnerByOrganizationId(orgId) {
      return {
        userId: "user-owner-123",
        role: "OWNER",
      };
    },
  };

  const mockLeadRepo = {
    async create(lead) {
      createdLeadData = lead;
      return {
        ...lead,
        id: "lead-new-uuid-456",
        createdAt: new Date(),
      };
    },
  };

  const mockSendLeadToWhatsappUseCase = {
    async execute(payload) {
      sentWhatsappPayload = payload;
      return {
        sent: true,
        instanceName: "platform-customer-support-whatsapp",
        recipients: [{ recipientNumber: "919010510476" }],
      };
    },
  };

  const useCase = new SubmitProjectRequestUseCase({
    projectRepository: mockProjectRepo,
    projectMemberRepository: mockProjectMemberRepo,
    organizationRepository: mockOrgRepo,
    organizationMemberRepository: mockOrgMemberRepo,
    leadRepository: mockLeadRepo,
    sendLeadToWhatsappUseCase: mockSendLeadToWhatsappUseCase,
  });

  const result = await useCase.execute({
    fullName: "Rakesh Sharma",
    mobile: "9010510476",
    email: "rakesh@shaiviktechnologies.in",
    company: "Shaivik Tech",
    projectType: "Mobile App Development",
    requirements: "Need an enterprise mobile app for iOS and Android.",
  });

  // Verify Project Creation
  assert.ok(result.project);
  assert.equal(result.project.id, "proj-new-uuid-123");
  assert.equal(createdProjectData.name, "Mobile App Development - Shaivik Tech");
  assert.ok(createdProjectData.description.includes("Client: Rakesh Sharma"));
  assert.ok(createdProjectData.description.includes("Phone: 9010510476"));
  assert.ok(createdProjectData.description.includes("Company: Shaivik Tech"));
  assert.ok(createdProjectData.description.includes("Project Type: Mobile App Development"));
  assert.ok(createdProjectData.description.includes("Need an enterprise mobile app"));
  assert.equal(createdProjectData.status, "ACTIVE");
  assert.equal(createdProjectData.createdBy, "user-owner-123");

  // Verify Project Member Creation for Owner
  assert.ok(createdProjectMember);
  assert.equal(createdProjectMember.projectId, "proj-new-uuid-123");
  assert.equal(createdProjectMember.userId, "user-owner-123");
  assert.equal(createdProjectMember.role, "OWNER");

  // Verify Lead Creation
  assert.ok(result.lead);
  assert.equal(result.lead.id, "lead-new-uuid-456");
  assert.equal(createdLeadData.name, "Rakesh Sharma");
  assert.equal(createdLeadData.phone, "9010510476");
  assert.equal(createdLeadData.email, "rakesh@shaiviktechnologies.in");
  assert.equal(createdLeadData.source, "WEBSITE_PROJECT_REQUEST");
  assert.equal(createdLeadData.status, "NEW");
  assert.equal(createdLeadData.metadata.company, "Shaivik Tech");
  assert.equal(createdLeadData.metadata.projectType, "Mobile App Development");

  // Verify WhatsApp Dispatch
  assert.ok(sentWhatsappPayload);
  assert.equal(sentWhatsappPayload.organizationId, "5e62e09b-8bf7-41ab-a13c-e0bfa70e0192");
  assert.equal(sentWhatsappPayload.lead.name, "Rakesh Sharma");
  assert.equal(result.whatsapp.sent, true);
});

test("SubmitProjectRequestUseCase gracefully handles WhatsApp failure without rolling back project", async () => {
  const mockProjectRepo = {
    async create(project) {
      return { ...project, id: "proj-789", createdAt: new Date(), updatedAt: new Date() };
    },
  };
  const mockProjectMemberRepo = {
    async create() { return {}; },
  };
  const mockOrgRepo = {
    async findById() {
      return { id: "5e62e09b-8bf7-41ab-a13c-e0bfa70e0192", ownerId: "user-123" };
    },
  };
  const mockOrgMemberRepo = {
    async findOwnerByOrganizationId() { return { userId: "user-123" }; },
  };
  const mockLeadRepo = {
    async create(lead) { return { ...lead, id: "lead-789" }; },
  };
  const mockSendLeadToWhatsappUseCase = {
    async execute() {
      throw new Error("Evolution API timeout");
    },
  };

  const useCase = new SubmitProjectRequestUseCase({
    projectRepository: mockProjectRepo,
    projectMemberRepository: mockProjectMemberRepo,
    organizationRepository: mockOrgRepo,
    organizationMemberRepository: mockOrgMemberRepo,
    leadRepository: mockLeadRepo,
    sendLeadToWhatsappUseCase: mockSendLeadToWhatsappUseCase,
  });

  const result = await useCase.execute({
    fullName: "Jane Doe",
    mobile: "9876543210",
    requirements: "AI Chatbot integration",
  });

  // Project and lead are still successfully returned
  assert.ok(result.project);
  assert.equal(result.project.id, "proj-789");
  assert.ok(result.lead);
  assert.equal(result.whatsapp.sent, false);
  assert.ok(result.whatsapp.error.includes("Evolution API timeout"));
});

test("SubmitProjectRequestUseCase validates required fields", async () => {
  const useCase = new SubmitProjectRequestUseCase({});

  await assert.rejects(
    async () => {
      await useCase.execute({
        fullName: "",
        mobile: "9010510476",
        requirements: "Some requirement",
      });
    },
    { message: "Full name is required." },
  );

  await assert.rejects(
    async () => {
      await useCase.execute({
        fullName: "Rakesh",
        mobile: "",
        requirements: "Some requirement",
      });
    },
    { message: "Mobile number is required." },
  );

  await assert.rejects(
    async () => {
      await useCase.execute({
        fullName: "Rakesh",
        mobile: "9010510476",
        requirements: "   ",
      });
    },
    { message: "Project requirements are required." },
  );
});
