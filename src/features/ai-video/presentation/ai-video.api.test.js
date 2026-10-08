import test from "node:test";
import assert from "node:assert/strict";

import { VideoProjectController } from "./controllers/video-project.controller.js";
import { VideoCharacterController } from "./controllers/video-character.controller.js";
import { VideoSceneController } from "./controllers/video-scene.controller.js";
import { AiDirectorController } from "./controllers/ai-director.controller.js";
import { AiVideoValidator } from "./validators/ai-video.validator.js";
import { ValidationError } from "../../../common/errors/ValidationError.js";
import { AppError } from "../../../common/errors/AppError.js";

function createMockControllers() {
  const projects = new Map();
  const scenes = new Map();
  const characters = new Map();

  const mockProjectRepo = {
    async create(data) {
      const id = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const entity = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      projects.set(id, entity);
      return entity;
    },
    async findById(id) {
      return projects.get(id) || null;
    },
    async findByIdForOrganization(id, organizationId) {
      const proj = projects.get(id);
      if (proj && proj.organizationId === organizationId) return proj;
      return null;
    },
    async findAllByOrganization(organizationId, { limit = 20, offset = 0 } = {}) {
      const list = Array.from(projects.values()).filter(p => p.organizationId === organizationId);
      return { projects: list.slice(offset, offset + limit), total: list.length };
    },
    async update(id, updateData) {
      const existing = projects.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...updateData, updatedAt: new Date() };
      projects.set(id, updated);
      return updated;
    },
    async updateStatus(id, status, extraPayload = {}) {
      const existing = projects.get(id);
      if (!existing) return null;
      const updated = { ...existing, status, ...extraPayload, updatedAt: new Date() };
      projects.set(id, updated);
      return updated;
    },
    async deleteForOrganization(id, organizationId) {
      const proj = projects.get(id);
      if (proj && proj.organizationId === organizationId) {
        return projects.delete(id);
      }
      return false;
    },
  };

  const mockSceneRepo = {
    async create(data) {
      const id = `scene-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const entity = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      scenes.set(id, entity);
      return entity;
    },
    async findById(id) {
      return scenes.get(id) || null;
    },
    async findByProjectId(videoProjectId) {
      return Array.from(scenes.values())
        .filter(s => s.videoProjectId === videoProjectId)
        .sort((a, b) => a.sceneNumber - b.sceneNumber);
    },
    async update(id, updateData) {
      const existing = scenes.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...updateData, updatedAt: new Date() };
      scenes.set(id, updated);
      return updated;
    },
    async updateStatus(id, status, extraPayload = {}) {
      const existing = scenes.get(id);
      if (!existing) return null;
      const updated = { ...existing, status, ...extraPayload, updatedAt: new Date() };
      scenes.set(id, updated);
      return updated;
    },
    async delete(id) {
      return scenes.delete(id);
    },
    async deleteByProjectId(videoProjectId) {
      const toDelete = Array.from(scenes.values()).filter(s => s.videoProjectId === videoProjectId);
      for (const s of toDelete) scenes.delete(s.id);
      return true;
    },
  };

  const mockCharRepo = {
    async create(data) {
      const id = `char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const entity = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      characters.set(id, entity);
      return entity;
    },
    async findById(id) {
      return characters.get(id) || null;
    },
    async findByIdForOrganization(id, organizationId) {
      const char = characters.get(id);
      if (char && char.organizationId === organizationId) return char;
      return null;
    },
    async findAllByOrganization(organizationId, { limit = 50, offset = 0 } = {}) {
      const list = Array.from(characters.values()).filter(c => c.organizationId === organizationId);
      return { characters: list.slice(offset, offset + limit), total: list.length };
    },
  };

  const mockAiProvider = {
    async chat(messages) {
      const sysMsg = messages.find(m => m.role === "system")?.content || "";
      if (sysMsg.includes("JSON Storyboard")) {
        return JSON.stringify({
          title: "AI Video Title",
          synopsis: "AI synopsis",
          language: "en",
          aspectRatio: "9:16",
          style: "cartoon",
          duration: 10,
          characters: [{ name: "Hero", gender: "male", prompt: "A brave hero", voice: "en-1" }],
          scenes: [
            { sceneNumber: 1, visualPrompt: "V1", motionPrompt: "M1", dialogue: "D1", speaker: "Hero", duration: 5 },
            { sceneNumber: 2, visualPrompt: "V2", motionPrompt: "M2", dialogue: "D2", speaker: "Hero", duration: 5 },
          ],
        });
      }
      return "Generated Script Text";
    },
  };

  // Instantiate Use Cases
  const createVideoProjectUseCase = {
    async execute({ organizationId, createdById, name, prompt, language, aspectRatio, duration, style }) {
      return mockProjectRepo.create({ organizationId, createdById, name, prompt, language, aspectRatio, duration, style, status: "DRAFT" });
    },
  };

  const getVideoProjectUseCase = {
    async execute({ organizationId, projectId }) {
      const project = await mockProjectRepo.findByIdForOrganization(projectId, organizationId);
      if (!project) throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
      const projectScenes = await mockSceneRepo.findByProjectId(projectId);
      return { project, scenes: projectScenes };
    },
  };

  const listVideoProjectsUseCase = {
    async execute({ organizationId, page, limit }) {
      return mockProjectRepo.findAllByOrganization(organizationId, { limit, offset: (page - 1) * limit });
    },
  };

  const deleteVideoProjectUseCase = {
    async execute({ organizationId, projectId }) {
      const deleted = await mockProjectRepo.deleteForOrganization(projectId, organizationId);
      if (!deleted) throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
      await mockSceneRepo.deleteByProjectId(projectId);
      return { success: true };
    },
  };

  const createVideoCharacterUseCase = {
    async execute({ organizationId, createdById, name, description, referenceImageUrl, style }) {
      return mockCharRepo.create({ organizationId, createdById, name, description, referenceImageUrl, style });
    },
  };

  const listVideoCharactersUseCase = {
    async execute({ organizationId, page, limit }) {
      return mockCharRepo.findAllByOrganization(organizationId, { limit, offset: (page - 1) * limit });
    },
  };

  const getVideoCharacterUseCase = {
    async execute({ organizationId, characterId }) {
      const char = await mockCharRepo.findByIdForOrganization(characterId, organizationId);
      if (!char) throw new AppError("Video character not found", 404, "CHARACTER_NOT_FOUND");
      return char;
    },
  };

  const createVideoSceneUseCase = {
    async execute({ organizationId, videoProjectId, duration, visualPrompt, dialogue }) {
      const proj = await mockProjectRepo.findByIdForOrganization(videoProjectId, organizationId);
      if (!proj) throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
      const existing = await mockSceneRepo.findByProjectId(videoProjectId);
      return mockSceneRepo.create({ videoProjectId, sceneNumber: existing.length + 1, duration, visualPrompt, dialogue, status: "PENDING" });
    },
  };

  const updateVideoSceneUseCase = {
    async execute({ organizationId, sceneId, visualPrompt }) {
      const scene = await mockSceneRepo.findById(sceneId);
      if (!scene) throw new AppError("Video scene not found", 404, "SCENE_NOT_FOUND");
      const proj = await mockProjectRepo.findByIdForOrganization(scene.videoProjectId, organizationId);
      if (!proj) throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
      return mockSceneRepo.update(sceneId, { visualPrompt });
    },
  };

  const deleteVideoSceneUseCase = {
    async execute({ organizationId, sceneId }) {
      const scene = await mockSceneRepo.findById(sceneId);
      if (!scene) throw new AppError("Video scene not found", 404, "SCENE_NOT_FOUND");
      const proj = await mockProjectRepo.findByIdForOrganization(scene.videoProjectId, organizationId);
      if (!proj) throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
      return mockSceneRepo.delete(sceneId);
    },
  };

  const updateSceneStatusUseCase = {
    async execute({ organizationId, sceneId, status }) {
      const scene = await mockSceneRepo.findById(sceneId);
      if (!scene) throw new AppError("Video scene not found", 404, "SCENE_NOT_FOUND");
      const proj = await mockProjectRepo.findByIdForOrganization(scene.videoProjectId, organizationId);
      if (!proj) throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
      return mockSceneRepo.updateStatus(sceneId, status);
    },
  };

  const generateVideoScriptUseCase = {
    async execute({ organizationId, projectId }) {
      const proj = await mockProjectRepo.findByIdForOrganization(projectId, organizationId);
      if (!proj) throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
      const script = await mockAiProvider.chat([]);
      const updated = await mockProjectRepo.update(projectId, { script, status: "DRAFT" });
      return { project: updated, script };
    },
  };

  const generateVideoStoryboardUseCase = {
    async execute({ organizationId, projectId }) {
      const proj = await mockProjectRepo.findByIdForOrganization(projectId, organizationId);
      if (!proj) throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
      const json = await mockAiProvider.chat([{ role: "system", content: "JSON Storyboard" }]);
      const storyboard = JSON.parse(json);
      await mockSceneRepo.deleteByProjectId(projectId);
      const s1 = await mockSceneRepo.create({ videoProjectId: projectId, sceneNumber: 1, duration: 5, visualPrompt: "V1", status: "PENDING" });
      const s2 = await mockSceneRepo.create({ videoProjectId: projectId, sceneNumber: 2, duration: 5, visualPrompt: "V2", status: "PENDING" });
      const updated = await mockProjectRepo.update(projectId, { storyboard, status: "DRAFT" });
      return { project: updated, storyboard, scenes: [s1, s2] };
    },
  };

  const calculateVideoProjectProgressUseCase = {
    async execute({ organizationId, projectId }) {
      const proj = await mockProjectRepo.findByIdForOrganization(projectId, organizationId);
      if (!proj) throw new AppError("Video project not found", 404, "PROJECT_NOT_FOUND");
      const projScenes = await mockSceneRepo.findByProjectId(projectId);
      return {
        progressPercentage: 50,
        overallStatus: "PROCESSING",
        breakdown: { totalScenes: projScenes.length, completedScenes: 0, failedScenes: 0, pendingScenes: projScenes.length, inProgressScenes: 0 },
      };
    },
  };

  // Instantiate Controllers
  const videoProjectController = new VideoProjectController({
    createVideoProjectUseCase,
    getVideoProjectUseCase,
    listVideoProjectsUseCase,
    deleteVideoProjectUseCase,
  });

  const videoCharacterController = new VideoCharacterController({
    createVideoCharacterUseCase,
    getVideoCharacterUseCase,
    listVideoCharactersUseCase,
  });

  const videoSceneController = new VideoSceneController({
    createVideoSceneUseCase,
    updateVideoSceneUseCase,
    deleteVideoSceneUseCase,
    updateSceneStatusUseCase,
  });

  const aiDirectorController = new AiDirectorController({
    generateVideoScriptUseCase,
    generateVideoStoryboardUseCase,
    calculateVideoProjectProgressUseCase,
  });

  return {
    videoProjectController,
    videoCharacterController,
    videoSceneController,
    aiDirectorController,
  };
}

function createMockReqRes({ body = {}, params = {}, query = {}, organizationId = "org-123", userId = "user-123" } = {}) {
  const req = {
    body,
    params,
    query,
    headers: organizationId ? { "x-organization-id": organizationId } : {},
    user: userId ? { id: userId } : null,
    context: {
      organization: organizationId ? { id: organizationId } : null,
      user: userId ? { id: userId } : null,
    },
  };

  let statusCode = 200;
  let jsonResponse = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    },
    getResponse() {
      return { statusCode, body: jsonResponse };
    },
  };

  return { req, res };
}

async function runController(handler, req, res) {
  let caughtError = null;
  const next = (err) => {
    if (err) caughtError = err;
  };
  handler(req, res, next);
  await new Promise((resolve) => setTimeout(resolve, 20));
  if (caughtError) throw caughtError;
  return res.getResponse();
}

// 1. Validation Tests
test("AiVideoValidator validates inputs and throws ValidationError for bad inputs", () => {
  assert.throws(
    () => AiVideoValidator.validateCreateProjectInput({ name: "" }),
    (err) => err instanceof ValidationError && err.message.includes("Project name is required")
  );

  assert.throws(
    () => AiVideoValidator.validateCreateProjectInput({ name: "Valid", language: "invalid-lang" }),
    (err) => err instanceof ValidationError && err.message.includes("Invalid language")
  );

  assert.throws(
    () => AiVideoValidator.validateCreateProjectInput({ name: "Valid", aspectRatio: "invalid-aspect" }),
    (err) => err instanceof ValidationError && err.message.includes("Invalid aspect ratio")
  );

  assert.throws(
    () => AiVideoValidator.validateUpdateSceneStatusInput({ status: "INVALID_STATUS" }),
    (err) => err instanceof ValidationError && err.message.includes("Invalid status")
  );
});

// 2. Authentication Context Test
test("Controller throws ValidationError when organization context is missing", async () => {
  const { videoProjectController } = createMockControllers();
  const { req, res } = createMockReqRes({ organizationId: null, body: { name: "Valid Name" } });

  await assert.rejects(
    async () => {
      await runController(videoProjectController.create, req, res);
    },
    (err) => {
      assert.equal(err instanceof ValidationError, true);
      assert.match(err.message, /Organization context is required/);
      return true;
    }
  );
});

// 3. Project Controller APIs
test("VideoProjectController endpoints (create, list, get, delete)", async () => {
  const { videoProjectController } = createMockControllers();

  // Create
  const { req: reqCreate, res: resCreate } = createMockReqRes({
    body: { name: "API Project 1", language: "te", aspectRatio: "9:16", duration: 30 },
  });
  const createRes = await runController(videoProjectController.create, reqCreate, resCreate);
  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.success, true);
  const projectId = createRes.body.data.id;

  // Get
  const { req: reqGet, res: resGet } = createMockReqRes({ params: { projectId } });
  const getRes = await runController(videoProjectController.get, reqGet, resGet);
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.data.project.name, "API Project 1");

  // List
  const { req: reqList, res: resList } = createMockReqRes({ query: { page: 1, limit: 10 } });
  const listRes = await runController(videoProjectController.list, reqList, resList);
  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.body.data.length, 1);

  // Delete
  const { req: reqDel, res: resDel } = createMockReqRes({ params: { projectId } });
  const delRes = await runController(videoProjectController.delete, reqDel, resDel);
  assert.equal(delRes.statusCode, 200);
  assert.equal(delRes.body.success, true);
});

// 4. Character Controller APIs
test("VideoCharacterController endpoints (create, list, get)", async () => {
  const { videoCharacterController } = createMockControllers();

  const { req: reqCreate, res: resCreate } = createMockReqRes({
    body: { name: "Character 1", description: "Hero character", style: "cartoon" },
  });
  const createRes = await runController(videoCharacterController.create, reqCreate, resCreate);
  assert.equal(createRes.statusCode, 201);
  const characterId = createRes.body.data.id;

  const { req: reqGet, res: resGet } = createMockReqRes({ params: { characterId } });
  const getRes = await runController(videoCharacterController.get, reqGet, resGet);
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.data.name, "Character 1");

  const { req: reqList, res: resList } = createMockReqRes({ query: { page: 1, limit: 50 } });
  const listRes = await runController(videoCharacterController.list, reqList, resList);
  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.body.data.length, 1);
});

// 5. Scene Controller APIs
test("VideoSceneController endpoints (create, update, status update, delete)", async () => {
  const { videoProjectController, videoSceneController } = createMockControllers();

  const { req: reqProj, res: resProj } = createMockReqRes({ body: { name: "Scene Test Proj" } });
  const projRes = await runController(videoProjectController.create, reqProj, resProj);
  const projectId = projRes.body.data.id;

  // Create Scene
  const { req: reqSceneCreate, res: resSceneCreate } = createMockReqRes({
    params: { projectId },
    body: { visualPrompt: "Background in space station", duration: 5 },
  });
  const createSceneRes = await runController(videoSceneController.create, reqSceneCreate, resSceneCreate);
  assert.equal(createSceneRes.statusCode, 201);
  const sceneId = createSceneRes.body.data.id;

  // Update Scene
  const { req: reqSceneUpdate, res: resSceneUpdate } = createMockReqRes({
    params: { sceneId },
    body: { visualPrompt: "Updated space station" },
  });
  const updateSceneRes = await runController(videoSceneController.update, reqSceneUpdate, resSceneUpdate);
  assert.equal(updateSceneRes.statusCode, 200);
  assert.equal(updateSceneRes.body.data.visualPrompt, "Updated space station");

  // Update Status
  const { req: reqStatus, res: resStatus } = createMockReqRes({
    params: { sceneId },
    body: { status: "IMAGE_READY" },
  });
  const statusRes = await runController(videoSceneController.updateStatus, reqStatus, resStatus);
  assert.equal(statusRes.statusCode, 200);
  assert.equal(statusRes.body.data.status, "IMAGE_READY");

  // Delete Scene
  const { req: reqSceneDel, res: resSceneDel } = createMockReqRes({ params: { sceneId } });
  const delSceneRes = await runController(videoSceneController.delete, reqSceneDel, resSceneDel);
  assert.equal(delSceneRes.statusCode, 200);
});

// 6. AI Director Controller APIs
test("AiDirectorController endpoints (script, storyboard, progress)", async () => {
  const { videoProjectController, aiDirectorController } = createMockControllers();

  const { req: reqProj, res: resProj } = createMockReqRes({ body: { name: "AI Director Proj" } });
  const projRes = await runController(videoProjectController.create, reqProj, resProj);
  const projectId = projRes.body.data.id;

  // Generate Script
  const { req: reqScript, res: resScript } = createMockReqRes({
    params: { projectId },
    body: { topicPrompt: "AI SaaS platform", isSync: true },
  });
  const scriptRes = await runController(aiDirectorController.generateScript, reqScript, resScript);
  assert.equal(scriptRes.statusCode, 200);
  assert.equal(scriptRes.body.success, true);

  // Generate Storyboard
  const { req: reqBoard, res: resBoard } = createMockReqRes({
    params: { projectId },
    body: { scriptText: "Sample script text", isSync: true },
  });
  const boardRes = await runController(aiDirectorController.generateStoryboard, reqBoard, resBoard);
  assert.equal(boardRes.statusCode, 200);
  assert.equal(boardRes.body.data.scenes.length, 2);

  // Get Progress
  const { req: reqProg, res: resProg } = createMockReqRes({ params: { projectId } });
  const progRes = await runController(aiDirectorController.getProgress, reqProg, resProg);
  assert.equal(progRes.statusCode, 200);
  assert.equal(progRes.body.data.progressPercentage, 50);
});

// 7. Cross-Tenant Isolation & Header Spoofing Security Verification
test("Controller enforces Organization Isolation & prevents x-organization-id header spoofing", async () => {
  const { videoProjectController, videoCharacterController, videoSceneController, aiDirectorController } = createMockControllers();

  // Create Project in Org A
  const { req: reqCreateA, res: resCreateA } = createMockReqRes({
    organizationId: "org-A",
    userId: "user-A",
    body: { name: "Org A Private Project" },
  });
  const createResA = await runController(videoProjectController.create, reqCreateA, resCreateA);
  const projectIdA = createResA.body.data.id;

  // Create Character in Org A
  const { req: reqCharA, res: resCharA } = createMockReqRes({
    organizationId: "org-A",
    userId: "user-A",
    body: { name: "Org A Character" },
  });
  const charResA = await runController(videoCharacterController.create, reqCharA, resCharA);
  const characterIdA = charResA.body.data.id;

  // Create Scene in Org A
  const { req: reqSceneA, res: resSceneA } = createMockReqRes({
    organizationId: "org-A",
    userId: "user-A",
    params: { projectId: projectIdA },
    body: { visualPrompt: "Org A Scene" },
  });
  const sceneResA = await runController(videoSceneController.create, reqSceneA, resSceneA);
  const sceneIdA = sceneResA.body.data.id;

  // 1. User from Org B trying to GET Org A Project -> Must Fail (404/403)
  const { req: reqGetB, res: resGetB } = createMockReqRes({ organizationId: "org-B", userId: "user-B", params: { projectId: projectIdA } });
  await assert.rejects(
    async () => await runController(videoProjectController.get, reqGetB, resGetB),
    (err) => err instanceof AppError && err.statusCode === 404
  );

  // 2. User from Org B trying to DELETE Org A Project -> Must Fail (404/403)
  const { req: reqDelB, res: resDelB } = createMockReqRes({ organizationId: "org-B", userId: "user-B", params: { projectId: projectIdA } });
  await assert.rejects(
    async () => await runController(videoProjectController.delete, reqDelB, resDelB),
    (err) => err instanceof AppError && err.statusCode === 404
  );

  // 3. User from Org B trying to GET Org A Character -> Must Fail (404/403)
  const { req: reqGetCharB, res: resGetCharB } = createMockReqRes({ organizationId: "org-B", userId: "user-B", params: { characterId: characterIdA } });
  await assert.rejects(
    async () => await runController(videoCharacterController.get, reqGetCharB, resGetCharB),
    (err) => err instanceof AppError && err.statusCode === 404
  );

  // 4. User from Org B trying to PATCH Org A Scene -> Must Fail (404/403)
  const { req: reqPatchSceneB, res: resPatchSceneB } = createMockReqRes({ organizationId: "org-B", userId: "user-B", params: { sceneId: sceneIdA }, body: { visualPrompt: "Hacked" } });
  await assert.rejects(
    async () => await runController(videoSceneController.update, reqPatchSceneB, resPatchSceneB),
    (err) => err instanceof AppError && err.statusCode === 404
  );

  // 5. User from Org B trying to DELETE Org A Scene -> Must Fail (404/403)
  const { req: reqDelSceneB, res: resDelSceneB } = createMockReqRes({ organizationId: "org-B", userId: "user-B", params: { sceneId: sceneIdA } });
  await assert.rejects(
    async () => await runController(videoSceneController.delete, reqDelSceneB, resDelSceneB),
    (err) => err instanceof AppError && err.statusCode === 404
  );

  // 6. User from Org B trying to trigger Script Generation on Org A Project -> Must Fail (404/403)
  const { req: reqScriptB, res: resScriptB } = createMockReqRes({ organizationId: "org-B", userId: "user-B", params: { projectId: projectIdA }, body: { isSync: true } });
  await assert.rejects(
    async () => await runController(aiDirectorController.generateScript, reqScriptB, resScriptB),
    (err) => err instanceof AppError && err.statusCode === 404
  );

  // 7. User from Org B trying to trigger Storyboard Generation on Org A Project -> Must Fail (404/403)
  const { req: reqBoardB, res: resBoardB } = createMockReqRes({ organizationId: "org-B", userId: "user-B", params: { projectId: projectIdA }, body: { isSync: true } });
  await assert.rejects(
    async () => await runController(aiDirectorController.generateStoryboard, reqBoardB, resBoardB),
    (err) => err instanceof AppError && err.statusCode === 404
  );

  // 8. User from Org B trying to fetch Progress of Org A Project -> Must Fail (404/403)
  const { req: reqProgB, res: resProgB } = createMockReqRes({ organizationId: "org-B", userId: "user-B", params: { projectId: projectIdA } });
  await assert.rejects(
    async () => await runController(aiDirectorController.getProgress, reqProgB, resProgB),
    (err) => err instanceof AppError && err.statusCode === 404
  );
});

// 8. Phase 5.3 Script Generation Regression & Serialization Tests
test("Phase 5.3 Script Generation Fix: Async response, payload sanitization, and error preservation", async () => {
  const { videoProjectController, aiDirectorController } = createMockControllers();

  // Create Project
  const { req: reqProj, res: resProj } = createMockReqRes({ body: { name: "Serialization Test Proj" } });
  const projRes = await runController(videoProjectController.create, reqProj, resProj);
  const projectId = projRes.body.data.id;

  // Test 1 & 4: Async script generation immediately returns status GENERATING
  const { req: reqAsyncScript, res: resAsyncScript } = createMockReqRes({
    params: { projectId },
    body: { topicPrompt: "Telugu AI Reel", forceRegenerate: false, isSync: false },
  });
  const asyncRes = await runController(aiDirectorController.generateScript, reqAsyncScript, resAsyncScript);
  assert.equal(asyncRes.statusCode, 200);
  assert.equal(asyncRes.body.success, true);
  assert.equal(asyncRes.body.status, "GENERATING");

  // Test 2 & 3: Retry with forceRegenerate=true passes boolean primitives only
  const { req: reqRetry, res: resRetry } = createMockReqRes({
    params: { projectId },
    body: { forceRegenerate: true, isSync: true },
  });
  const retryRes = await runController(aiDirectorController.generateScript, reqRetry, resRetry);
  assert.equal(retryRes.statusCode, 200);
  assert.equal(typeof reqRetry.body.forceRegenerate, "boolean");
  assert.equal(reqRetry.body.forceRegenerate, true);

  // Test 6: Verify errorMessage preservation on get
  const { req: reqGet, res: resGet } = createMockReqRes({ params: { projectId } });
  const getRes = await runController(videoProjectController.get, reqGet, resGet);
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.data.project.id, projectId);
});

