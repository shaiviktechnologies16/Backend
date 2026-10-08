import test from "node:test";
import assert from "node:assert/strict";

import { ResolveOrganizationContextUseCase } from "../../shared/context/application/use-cases/resolve-organization-context.usecase.js";
import { ResolveContextUseCase } from "../../shared/context/application/use-cases/resolve-context.usecase.js";
import { UserContextEntity } from "../../shared/context/domain/entities/user-context.entity.js";
import { AppError } from "../../../common/errors/AppError.js";
import { VideoProjectController } from "./controllers/video-project.controller.js";

// Mock Repositories for Phase 5.2 Verification
function createMockContextRepositories() {
  const orgs = new Map([
    ["org-valid-1", { id: "org-valid-1", name: "Shaivik Technologies", slug: "shaivik", status: "ACTIVE" }],
    ["org-valid-2", { id: "org-valid-2", name: "Acme Corp", slug: "acme", status: "ACTIVE" }],
  ]);

  const memberships = new Map([
    ["org-valid-1_user-normal", { id: "mem-1", organizationId: "org-valid-1", userId: "user-normal", role: "MEMBER" }],
  ]);

  const mockOrgRepo = {
    async findById(id) {
      return orgs.get(id) || null;
    },
  };

  const mockOrgMemberRepo = {
    async findByOrganizationAndUser(organizationId, userId) {
      return memberships.get(`${organizationId}_${userId}`) || null;
    },
    async findByUserId(userId) {
      for (const m of memberships.values()) {
        if (m.userId === userId) return m;
      }
      return null;
    },
  };

  return { mockOrgRepo, mockOrgMemberRepo };
}

// Test 1 & 4: Platform Admin + valid organization -> success & correct req.context.organization.id
test("Test 1 & 4: Platform Admin + valid organization resolves trusted OrganizationContextEntity with role PLATFORM", async () => {
  const { mockOrgRepo, mockOrgMemberRepo } = createMockContextRepositories();
  const resolveOrgUseCase = new ResolveOrganizationContextUseCase({
    organizationRepository: mockOrgRepo,
    organizationMemberRepository: mockOrgMemberRepo,
  });

  const platformAdmin = new UserContextEntity({
    id: "admin-1",
    email: "admin@shaivik.ai",
    platformRole: "PLATFORM_ADMIN",
    permissions: [],
  });

  const orgContext = await resolveOrgUseCase.execute(platformAdmin, "org-valid-1");

  assert.equal(orgContext.id, "org-valid-1");
  assert.equal(orgContext.name, "Shaivik Technologies");
  assert.equal(orgContext.role, "PLATFORM");
});

// Test 2: Platform Admin + missing organization -> ORGANIZATION_CONTEXT_REQUIRED in AI Video controller
test("Test 2: Missing organization context throws ORGANIZATION_CONTEXT_REQUIRED with HTTP 400", async () => {
  const controller = new VideoProjectController({
    createVideoProjectUseCase: { execute: async () => ({}) },
  });

  const req = {
    context: {
      user: { id: "admin-1", platformRole: "PLATFORM_ADMIN" },
      organization: null,
    },
    body: { name: "Test Project" },
  };
  const res = {};
  const next = (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.errorCode, "ORGANIZATION_CONTEXT_REQUIRED");
    assert.equal(err.statusCode, 400);
  };

  await controller.create(req, res, next);
});

// Test 3: Platform Admin + nonexistent organization -> ORGANIZATION_CONTEXT_NOT_FOUND (404)
test("Test 3: Platform Admin + nonexistent organization throws ORGANIZATION_CONTEXT_NOT_FOUND (404)", async () => {
  const { mockOrgRepo, mockOrgMemberRepo } = createMockContextRepositories();
  const resolveOrgUseCase = new ResolveOrganizationContextUseCase({
    organizationRepository: mockOrgRepo,
    organizationMemberRepository: mockOrgMemberRepo,
  });

  const platformAdmin = new UserContextEntity({
    id: "admin-1",
    email: "admin@shaivik.ai",
    platformRole: "PLATFORM_ADMIN",
  });

  await assert.rejects(
    async () => resolveOrgUseCase.execute(platformAdmin, "org-nonexistent-999"),
    (err) => err instanceof AppError && err.errorCode === "ORGANIZATION_CONTEXT_NOT_FOUND" && err.statusCode === 404,
  );
});

// Test 5 & 6: Unauthorized normal user + another org -> rejected (403), normal user + own org -> success
test("Test 5 & 6: Unauthorized normal user accessing non-member organization is rejected (403), member org succeeds", async () => {
  const { mockOrgRepo, mockOrgMemberRepo } = createMockContextRepositories();
  const resolveOrgUseCase = new ResolveOrganizationContextUseCase({
    organizationRepository: mockOrgRepo,
    organizationMemberRepository: mockOrgMemberRepo,
  });

  const normalUser = new UserContextEntity({
    id: "user-normal",
    email: "user@shaivik.ai",
    platformRole: "USER",
  });

  // Attempt non-member org (org-valid-2) -> Rejected (403)
  await assert.rejects(
    async () => resolveOrgUseCase.execute(normalUser, "org-valid-2"),
    (err) => err instanceof AppError && err.errorCode === "ORGANIZATION_CONTEXT_NOT_FOUND" && err.statusCode === 403,
  );

  // Attempt member org (org-valid-1) -> Success (200/201)
  const memberOrgContext = await resolveOrgUseCase.execute(normalUser, "org-valid-1");
  assert.equal(memberOrgContext.id, "org-valid-1");
  assert.equal(memberOrgContext.role, "MEMBER");
});

// Test 7 & 8: AI Video project stores correct organizationId and cross-tenant access is rejected
test("Test 7 & 8: AI Video project stores verified organizationId and rejects cross-tenant lookup", async () => {
  const createdProjects = [];
  const mockCreateProjectUseCase = {
    async execute(payload) {
      const proj = { id: "proj-100", ...payload };
      createdProjects.push(proj);
      return proj;
    },
  };
  const mockGetProjectUseCase = {
    async execute({ organizationId, projectId }) {
      const proj = createdProjects.find((p) => p.id === projectId);
      if (proj && proj.organizationId === organizationId) {
        return { project: proj, scenes: [] };
      }
      throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
    },
  };

  const controller = new VideoProjectController({
    createVideoProjectUseCase: mockCreateProjectUseCase,
    getVideoProjectUseCase: mockGetProjectUseCase,
  });

  // 1. Create project for Org 1
  const reqCreate = {
    context: {
      organization: { id: "org-valid-1" },
      user: { id: "admin-1" },
    },
    body: { name: "Org 1 Video Project" },
  };

  let jsonResult = null;
  const resCreate = {
    status(code) {
      assert.equal(code, 201);
      return this;
    },
    json(data) {
      jsonResult = data;
    },
  };

  await controller.create(reqCreate, resCreate, () => {});
  assert.equal(jsonResult.success, true);
  assert.equal(jsonResult.data.organizationId, "org-valid-1");
  assert.equal(jsonResult.project.id, "proj-100");
  assert.equal(jsonResult.project.organizationId, "org-valid-1");

  // 2. Fetch project with correct Org 1 -> Success
  const reqGetSuccess = {
    params: { projectId: "proj-100" },
    context: { organization: { id: "org-valid-1" } },
  };
  let getResult = null;
  const resGetSuccess = {
    json(data) {
      getResult = data;
    },
  };
  await controller.get(reqGetSuccess, resGetSuccess, () => {});
  assert.equal(getResult.project.id, "proj-100");

  // 3. Fetch project with Org 2 -> Cross-tenant rejected (404 PROJECT_NOT_FOUND)
  const reqGetCrossTenant = {
    params: { projectId: "proj-100" },
    context: { organization: { id: "org-valid-2" } },
  };
  await controller.get(reqGetCrossTenant, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.errorCode, "PROJECT_NOT_FOUND");
    assert.equal(err.statusCode, 404);
  });
});
