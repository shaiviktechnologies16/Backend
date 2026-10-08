import test from "node:test";
import assert from "node:assert/strict";

import { CreateVideoProjectUseCase } from "./create-video-project.usecase.js";
import { GetVideoProjectUseCase } from "./get-video-project.usecase.js";
import { ListVideoProjectsUseCase } from "./list-video-projects.usecase.js";
import { DeleteVideoProjectUseCase } from "./delete-video-project.usecase.js";

import { CreateVideoCharacterUseCase } from "./create-video-character.usecase.js";
import { ListVideoCharactersUseCase } from "./list-video-characters.usecase.js";
import { GetVideoCharacterUseCase } from "./get-video-character.usecase.js";

import { CreateVideoSceneUseCase } from "./create-video-scene.usecase.js";
import { UpdateVideoSceneUseCase } from "./update-video-scene.usecase.js";
import { DeleteVideoSceneUseCase } from "./delete-video-scene.usecase.js";
import { UpdateSceneStatusUseCase } from "./update-scene-status.usecase.js";

import { GenerateVideoScriptUseCase } from "./generate-video-script.usecase.js";
import { GenerateVideoStoryboardUseCase } from "./generate-video-storyboard.usecase.js";
import { GenerateVideoSceneImageUseCase } from "./generate-video-scene-image.usecase.js";
import { CalculateVideoProjectProgressUseCase } from "./calculate-video-project-progress.usecase.js";
import { StoryboardValidator } from "../validators/storyboard.validator.js";
import { VideoSceneController } from "../../presentation/controllers/video-scene.controller.js";

import { AppError } from "../../../../common/errors/AppError.js";
import { AI_VIDEO_PROJECT_STATUS, AI_VIDEO_SCENE_STATUS } from "../../domain/constants/ai-video.constants.js";
import { getLanguageInstruction, validateSpokenLanguage } from "../utils/language-prompt.helper.js";
import { OllamaProvider } from "../../../../providers/ollama/ollama.provider.js";

// Mock Repositories Store
function createMockRepositories() {
  const projects = new Map();
  const scenes = new Map();
  const characters = new Map();

  const mockProjectRepo = {
    async create(data) {
      const id = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
    async delete(id) {
      return projects.delete(id);
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
      const id = `scene-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
      for (const s of toDelete) {
        scenes.delete(s.id);
      }
      return true;
    },
  };

  const mockCharRepo = {
    async create(data) {
      const id = `char-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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

  const assets = new Map();
  const mockAssetRepo = {
    async create(data) {
      const id = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const entity = { id, ...data, createdAt: new Date() };
      assets.set(id, entity);
      return entity;
    },
    async findBySceneId(sceneId) {
      return Array.from(assets.values()).filter(a => a.sceneId === sceneId);
    },
  };

  return { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo, projects, scenes, characters, assets };
}

// 1. Project Creation
test("CreateVideoProjectUseCase creates a video project with status DRAFT", async () => {
  const { mockProjectRepo } = createMockRepositories();
  const useCase = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });

  const project = await useCase.execute({
    organizationId: "org-1",
    createdById: "user-1",
    name: "Shaivik 3D Promo",
    prompt: "A cool 3D animation video",
    language: "te",
    aspectRatio: "9:16",
    duration: 30,
  });

  assert.equal(project.name, "Shaivik 3D Promo");
  assert.equal(project.organizationId, "org-1");
  assert.equal(project.status, AI_VIDEO_PROJECT_STATUS.DRAFT);
  assert.equal(project.language, "te");
});

// 2. Organization Isolation
test("GetVideoProjectUseCase enforces organization isolation", async () => {
  const { mockProjectRepo, mockSceneRepo } = createMockRepositories();
  const createUseCase = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const getUseCase = new GetVideoProjectUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
  });

  const project = await createUseCase.execute({
    organizationId: "org-A",
    createdById: "user-1",
    name: "Org A Private Project",
  });

  // Accessing with Org A should succeed
  const resultA = await getUseCase.execute({ organizationId: "org-A", projectId: project.id });
  assert.equal(resultA.project.id, project.id);

  // Accessing with Org B should fail with PROJECT_NOT_FOUND (404)
  await assert.rejects(
    async () => {
      await getUseCase.execute({ organizationId: "org-B", projectId: project.id });
    },
    (err) => {
      assert.equal(err instanceof AppError, true);
      assert.equal(err.statusCode, 404);
      assert.equal(err.errorCode, "PROJECT_NOT_FOUND");
      return true;
    }
  );
});

// 3. Character Creation
test("CreateVideoCharacterUseCase creates character for organization", async () => {
  const { mockCharRepo } = createMockRepositories();
  const useCase = new CreateVideoCharacterUseCase({ videoCharacterRepository: mockCharRepo });

  const char = await useCase.execute({
    organizationId: "org-1",
    createdById: "user-1",
    name: "Shaivik Robot",
    description: "Futuristic AI Assistant",
    style: "3d-cartoon",
  });

  assert.equal(char.name, "Shaivik Robot");
  assert.equal(char.organizationId, "org-1");
});

// 4. Scene Creation
test("CreateVideoSceneUseCase creates and sequences scenes for a project", async () => {
  const { mockProjectRepo, mockSceneRepo } = createMockRepositories();
  const createProjUseCase = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const createSceneUseCase = new CreateVideoSceneUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
  });

  const project = await createProjUseCase.execute({
    organizationId: "org-1",
    createdById: "user-1",
    name: "Scene Test Project",
  });

  const scene1 = await createSceneUseCase.execute({
    organizationId: "org-1",
    videoProjectId: project.id,
    visualPrompt: "Introduction scene in high tech lab",
    dialogue: "Welcome to Shaivik AI",
  });

  const scene2 = await createSceneUseCase.execute({
    organizationId: "org-1",
    videoProjectId: project.id,
    visualPrompt: "Character explaining features",
    dialogue: "Create AI videos in seconds",
  });

  assert.equal(scene1.sceneNumber, 1);
  assert.equal(scene2.sceneNumber, 2);
  assert.equal(scene1.status, AI_VIDEO_SCENE_STATUS.PENDING);
});

// 5. Project Retrieval
test("GetVideoProjectUseCase retrieves project and its scenes", async () => {
  const { mockProjectRepo, mockSceneRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const createScene = new CreateVideoSceneUseCase({ videoProjectRepository: mockProjectRepo, videoSceneRepository: mockSceneRepo });
  const getProj = new GetVideoProjectUseCase({ videoProjectRepository: mockProjectRepo, videoSceneRepository: mockSceneRepo });

  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Retrievable Proj" });
  await createScene.execute({ organizationId: "org-1", videoProjectId: project.id, visualPrompt: "Scene 1" });

  const result = await getProj.execute({ organizationId: "org-1", projectId: project.id });
  assert.equal(result.project.id, project.id);
  assert.equal(result.scenes.length, 1);
});

// 6. Project Listing
test("ListVideoProjectsUseCase lists paginated projects per organization", async () => {
  const { mockProjectRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const listProj = new ListVideoProjectsUseCase({ videoProjectRepository: mockProjectRepo });

  await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "P1" });
  await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "P2" });
  await createProj.execute({ organizationId: "org-2", createdById: "u2", name: "Org 2 P1" });

  const resOrg1 = await listProj.execute({ organizationId: "org-1", page: 1, limit: 10 });
  assert.equal(resOrg1.total, 2);
  assert.equal(resOrg1.projects.length, 2);

  const resOrg2 = await listProj.execute({ organizationId: "org-2", page: 1, limit: 10 });
  assert.equal(resOrg2.total, 1);
});

// 7. Project Deletion
test("DeleteVideoProjectUseCase deletes project and associated scenes", async () => {
  const { mockProjectRepo, mockSceneRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const createScene = new CreateVideoSceneUseCase({ videoProjectRepository: mockProjectRepo, videoSceneRepository: mockSceneRepo });
  const deleteProj = new DeleteVideoProjectUseCase({ videoProjectRepository: mockProjectRepo, videoSceneRepository: mockSceneRepo });

  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "To Delete" });
  await createScene.execute({ organizationId: "org-1", videoProjectId: project.id, visualPrompt: "Scene 1" });

  const delResult = await deleteProj.execute({ organizationId: "org-1", projectId: project.id });
  assert.equal(delResult.success, true);

  const scenesAfter = await mockSceneRepo.findByProjectId(project.id);
  assert.equal(scenesAfter.length, 0);
});

// 8. Script Generation
test("GenerateVideoScriptUseCase invokes AI provider and updates script", async () => {
  const { mockProjectRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });

  const mockAiProvider = {
    async chat(messages) {
      return "TITLE: Shaivik AI Intro\nHOOK: Stop editing manually.\nSCENE 1: Show avatar talking.";
    },
  };

  const generateScript = new GenerateVideoScriptUseCase({
    videoProjectRepository: mockProjectRepo,
    aiProviderFactory: { getProvider: async () => mockAiProvider },
  });

  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Script Proj" });
  const res = await generateScript.execute({ organizationId: "org-1", projectId: project.id, topicPrompt: "AI SaaS product" });

  assert.match(res.script, /Shaivik AI Intro/);
  assert.equal(res.project.status, AI_VIDEO_PROJECT_STATUS.READY);
});

// 9. Storyboard Validation & Invalid AI Output
test("StoryboardValidator parses clean valid JSON and throws error for invalid JSON", () => {
  const validJsonStr = JSON.stringify({
    title: "Valid Video",
    synopsis: "A test video",
    language: "en",
    aspectRatio: "9:16",
    style: "cartoon",
    scenes: [
      {
        sceneNumber: 1,
        visualPrompt: "Futuristic city background",
        motionPrompt: "Camera pans right",
        dialogue: "Welcome to the future",
        speaker: "Shaivik",
        duration: 5,
      },
    ],
  });

  const validated = StoryboardValidator.validate(validJsonStr);
  assert.equal(validated.title, "Valid Video");
  assert.equal(validated.scenes.length, 1);

  // Invalid JSON test
  assert.throws(
    () => {
      StoryboardValidator.validate("Invalid Non-JSON String");
    },
    (err) => {
      assert.equal(err instanceof AppError, true);
      assert.equal(err.errorCode === "INVALID_STORYBOARD_JSON" || err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE", true);
      return true;
    }
  );
});

// 10. Storyboard Generation Failure Handling
test("GenerateVideoStoryboardUseCase marks project FAILED when AI fails", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });

  const failingAiProvider = {
    async chat() {
      throw new Error("AI Service Timeout");
    },
  };

  const generateStoryboard = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: { getProvider: async () => failingAiProvider },
  });

  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Failing Storyboard" });
  await mockProjectRepo.update(project.id, { script: "Sample script content" });

  await assert.rejects(
    async () => {
      await generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id });
    },
    (err) => {
      assert.equal(err instanceof AppError, true);
      assert.equal(err.errorCode, "AI_DIRECTOR_GENERATION_FAILED");
      return true;
    }
  );

  const projectAfter = await mockProjectRepo.findById(project.id);
  assert.equal(projectAfter.status, AI_VIDEO_PROJECT_STATUS.FAILED);
});

// 11. Scene Status Transitions
test("UpdateSceneStatusUseCase updates scene status and triggers project progress recalculation", async () => {
  const { mockProjectRepo, mockSceneRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const createScene = new CreateVideoSceneUseCase({ videoProjectRepository: mockProjectRepo, videoSceneRepository: mockSceneRepo });
  const updateSceneStatus = new UpdateSceneStatusUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    calculateVideoProjectProgressUseCase: new CalculateVideoProjectProgressUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
    }),
  });

  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Status Transition Proj" });
  const scene = await createScene.execute({ organizationId: "org-1", videoProjectId: project.id, visualPrompt: "S1" });

  const updatedScene = await updateSceneStatus.execute({
    organizationId: "org-1",
    sceneId: scene.id,
    status: AI_VIDEO_SCENE_STATUS.IMAGE_READY,
    referenceImageUrl: "https://example.com/img.png",
  });

  assert.equal(updatedScene.status, AI_VIDEO_SCENE_STATUS.IMAGE_READY);
  assert.equal(updatedScene.referenceImageUrl, "https://example.com/img.png");
});

// 12. Failed Individual Scene Handling & Progress Calculation
test("CalculateVideoProjectProgressUseCase handles failed individual scene without invalidating succeeded scenes", async () => {
  const { mockProjectRepo, mockSceneRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const createScene = new CreateVideoSceneUseCase({ videoProjectRepository: mockProjectRepo, videoSceneRepository: mockSceneRepo });
  const calcProgress = new CalculateVideoProjectProgressUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
  });

  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Partial Failure Proj" });
  const scene1 = await createScene.execute({ organizationId: "org-1", videoProjectId: project.id, visualPrompt: "S1" });
  const scene2 = await createScene.execute({ organizationId: "org-1", videoProjectId: project.id, visualPrompt: "S2" });

  // Mark Scene 1 COMPLETED
  await mockSceneRepo.updateStatus(scene1.id, AI_VIDEO_SCENE_STATUS.COMPLETED);
  // Mark Scene 2 FAILED
  await mockSceneRepo.updateStatus(scene2.id, AI_VIDEO_SCENE_STATUS.FAILED, { errorMessage: "VRAM overflow" });

  const progressResult = await calcProgress.execute({ organizationId: "org-1", projectId: project.id });

  assert.equal(progressResult.breakdown.totalScenes, 2);
  assert.equal(progressResult.breakdown.completedScenes, 1);
  assert.equal(progressResult.breakdown.failedScenes, 1);

  // Scene 1 remains intact in COMPLETED state
  const fetchedScene1 = await mockSceneRepo.findById(scene1.id);
  assert.equal(fetchedScene1.status, AI_VIDEO_SCENE_STATUS.COMPLETED);
});

// 13. Phase 5.3: Idempotency & Force Regenerate
test("Phase 5.3: GenerateVideoStoryboardUseCase honors forceRegenerate=false idempotency and forceRegenerate=true re-execution", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });

  let callCount = 0;
  const mockAiProvider = {
    async chat() {
      callCount++;
      return JSON.stringify({
        title: `Generated Storyboard ${callCount}`,
        synopsis: "Test synopsis",
        scenes: [{ sceneNumber: 1, visualPrompt: "Visual 1", dialogue: "Hello", duration: 5 }],
      });
    },
  };

  const generateStoryboard = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: { getProvider: async () => mockAiProvider },
  });

  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Idempotency Test" });
  await mockProjectRepo.update(project.id, { script: "Sample script content" });

  // First call (creates initial storyboard) -> status READY
  const res1 = await generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id });
  assert.equal(callCount, 1);
  assert.equal(res1.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // Second call with forceRegenerate=false -> Returns existing without LLM call
  const res2 = await generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id, forceRegenerate: false });
  assert.equal(callCount, 1);
  assert.equal(res2.storyboard.title, "Generated Storyboard 1");

  // Third call with forceRegenerate=true -> Executes new LLM call
  const res3 = await generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id, forceRegenerate: true });
  assert.equal(callCount, 2);
  assert.equal(res3.storyboard.title, "Generated Storyboard 2");
});

// 14. Phase 5.3: Content Preservation on Regeneration Failure
test("Phase 5.3: Regeneration failure retains previous successful storyboard and sets status FAILED", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });

  let shouldFail = false;
  const flakyAiProvider = {
    async chat() {
      if (shouldFail) {
        const err = new Error("Ollama request timed out after 300000ms");
        err.code = "AI_DIRECTOR_TIMEOUT";
        throw err;
      }
      return JSON.stringify({
        title: "Initial Storyboard",
        scenes: [{ sceneNumber: 1, visualPrompt: "Visual 1", duration: 5 }],
      });
    },
  };

  const generateStoryboard = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: { getProvider: async () => flakyAiProvider },
  });

  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Preservation Test" });
  await mockProjectRepo.update(project.id, { script: "Sample script content" });

  // 1. Initial success
  const initialRes = await generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id });
  assert.equal(initialRes.storyboard.title, "Initial Storyboard");
  assert.equal(initialRes.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // 2. Trigger regeneration failure
  shouldFail = true;
  await assert.rejects(
    async () => generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id, forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_TIMEOUT"
  );

  // 3. Verify project status is FAILED but previous storyboard content is preserved
  const projectAfter = await mockProjectRepo.findById(project.id);
  assert.equal(projectAfter.status, AI_VIDEO_PROJECT_STATUS.FAILED);
  assert.equal(projectAfter.storyboard.title, "Initial Storyboard");
});

// 15. Phase 5.3: Response Normalization & Validation for Script Generation
test("Phase 5.3: GenerateVideoScriptUseCase handles Ollama, OpenAI, plain string, unexpected object, and empty content", async () => {
  const { mockProjectRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Normalization Test Proj" });

  let responseToReturn;
  const mockAiProvider = {
    async chat() {
      return responseToReturn;
    },
  };

  const generateScript = new GenerateVideoScriptUseCase({
    videoProjectRepository: mockProjectRepo,
    aiProviderFactory: { getProvider: async () => mockAiProvider },
  });

  // 1. Ollama shape: { model, message: { content }, done: true }
  responseToReturn = { model: "qwen3:8b", message: { role: "assistant", content: "Ollama Script Content" }, done: true };
  const resOllama = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.equal(resOllama.script, "Ollama Script Content");
  assert.equal(resOllama.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // 2. OpenAI shape: { choices: [{ message: { content } }] }
  responseToReturn = { choices: [{ message: { role: "assistant", content: "OpenAI Script Content" } }] };
  const resOpenAI = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.equal(resOpenAI.script, "OpenAI Script Content");
  assert.equal(resOpenAI.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // 3. Plain string shape
  responseToReturn = "Plain String Script Content";
  const resString = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.equal(resString.script, "Plain String Script Content");
  assert.equal(resString.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // 4. Unexpected object shape -> AI_DIRECTOR_INVALID_RESPONSE
  responseToReturn = { unexpectedField: "some_value" };
  await assert.rejects(
    async () => generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE"
  );

  // 5. Empty content -> AI_DIRECTOR_INVALID_RESPONSE
  responseToReturn = { message: { content: "    " } };
  await assert.rejects(
    async () => generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE"
  );
});

// 16. Phase 5.3: Script Regeneration Failure Preserves Existing Script
test("Phase 5.3: Script regeneration failure retains previous successful script and sets status FAILED", async () => {
  const { mockProjectRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Script Preservation Test" });

  let shouldFail = false;
  const mockAiProvider = {
    async chat() {
      if (shouldFail) {
        return { badObject: true };
      }
      return { message: { content: "Original Successful Script" } };
    },
  };

  const generateScript = new GenerateVideoScriptUseCase({
    videoProjectRepository: mockProjectRepo,
    aiProviderFactory: { getProvider: async () => mockAiProvider },
  });

  // 1. Initial success
  const res1 = await generateScript.execute({ organizationId: "org-1", projectId: project.id });
  assert.equal(res1.script, "Original Successful Script");
  assert.equal(res1.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // 2. Trigger failure on regeneration
  shouldFail = true;
  await assert.rejects(
    async () => generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE"
  );

  // 3. Verify status is FAILED but script is preserved
  const projectAfter = await mockProjectRepo.findById(project.id);
  assert.equal(projectAfter.status, AI_VIDEO_PROJECT_STATUS.FAILED);
  assert.equal(projectAfter.script, "Original Successful Script");
});

// 17. Phase 5.3: Response Normalization for Storyboard Generation
test("Phase 5.3: GenerateVideoStoryboardUseCase normalizes Ollama, OpenAI, and rejects malformed objects", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Storyboard Normalization Test" });
  await mockProjectRepo.update(project.id, { script: "Sample script content" });

  const validStoryboardJson = JSON.stringify({
    title: "Normalized Storyboard",
    synopsis: "Test synopsis",
    scenes: [{ sceneNumber: 1, visualPrompt: "Visual 1", dialogue: "Hello", duration: 5 }],
  });

  let responseToReturn;
  const mockAiProvider = {
    async chat() {
      return responseToReturn;
    },
  };

  const generateStoryboard = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: { getProvider: async () => mockAiProvider },
  });

  // 1. Ollama shape
  responseToReturn = { message: { content: validStoryboardJson } };
  const resOllama = await generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id, forceRegenerate: true });
  assert.equal(resOllama.storyboard.title, "Normalized Storyboard");

  // 2. OpenAI shape
  responseToReturn = { choices: [{ message: { content: validStoryboardJson } }] };
  const resOpenAI = await generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id, forceRegenerate: true });
  assert.equal(resOpenAI.storyboard.title, "Normalized Storyboard");

  // 3. Invalid unexpected object
  responseToReturn = { invalidPayload: 123 };
  await assert.rejects(
    async () => generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id, forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE"
  );
});

// 18. Phase 5.3: Detailed Script Normalization & Status Transitions
test("Phase 5.3: normalizeScriptContent supports plain strings, JSON strings, parsed objects, nested content, null/undefined, and malformed objects", async () => {
  const { mockProjectRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Full Normalization Test Proj" });

  let responseToReturn;
  const mockAiProvider = {
    async chat() {
      return responseToReturn;
    },
  };

  const generateScript = new GenerateVideoScriptUseCase({
    videoProjectRepository: mockProjectRepo,
    aiProviderFactory: { getProvider: async () => mockAiProvider },
  });

  // 1. Plain string script
  responseToReturn = "Scene 1: Plain text prompt";
  const res1 = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.equal(res1.script, "Scene 1: Plain text prompt");
  assert.equal(res1.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // 2. JSON string script content
  responseToReturn = JSON.stringify({ title: "JSON Script Title", scenes: [{ sceneNumber: 1, text: "Scene 1 Text" }] });
  const res2 = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.match(res2.script, /JSON Script Title/);
  assert.equal(res2.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // 3. Already-parsed object script content
  responseToReturn = { title: "Parsed Object Title", scenes: [{ sceneNumber: 1, text: "Parsed Text" }] };
  const res3 = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.match(res3.script, /Parsed Object Title/);
  assert.equal(res3.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // 4. Nested { content: ... } provider response
  responseToReturn = { content: "Nested Content Script" };
  const res4 = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.equal(res4.script, "Nested Content Script");
  assert.equal(res4.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // 5. null / undefined -> AI_DIRECTOR_INVALID_RESPONSE
  responseToReturn = null;
  await assert.rejects(
    async () => generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE"
  );

  // 6. Invalid object -> AI_DIRECTOR_INVALID_RESPONSE
  responseToReturn = { unknownProp: 42 };
  await assert.rejects(
    async () => generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE"
  );
});

// 19. Phase 5.3.1: Language Enforcement Instruction - Telugu (te)
test("Phase 5.3.1: getLanguageInstruction generates Telugu script enforcement for te", () => {
  const instr = getLanguageInstruction("te");
  assert.match(instr, /Telugu/i);
  assert.match(instr, /Telugu script/i);
  assert.match(instr, /LANGUAGE REQUIREMENT IS MANDATORY/i);
});

// 20. Phase 5.3.1: Language Enforcement Instruction - English (en)
test("Phase 5.3.1: getLanguageInstruction generates English instruction for en", () => {
  const instr = getLanguageInstruction("en");
  assert.match(instr, /English/i);
});

// 21. Phase 5.3.1: Language Enforcement Instruction - Hindi (hi)
test("Phase 5.3.1: getLanguageInstruction generates Devanagari script instruction for hi", () => {
  const instr = getLanguageInstruction("hi");
  assert.match(instr, /Hindi/i);
  assert.match(instr, /Devanagari script/i);
});

// 22. Phase 5.3.1: Visual prompts allowed in English
test("Phase 5.3.1: validateSpokenLanguage allows English visual prompts when dialogue contains target script", () => {
  const storyboardObj = {
    title: "Telugu Video",
    scenes: [
      {
        sceneNumber: 1,
        visualPrompt: "A futuristic Indian developer working on a laptop at a high-tech desk in a modern studio",
        motionPrompt: "Slow camera pan left showing futuristic lab equipment",
        dialogue: "భాయ్, నేను హెల్ప్ చేయడానికి వచ్చాను!",
      },
    ],
  };

  const isValid = validateSpokenLanguage(storyboardObj, "te");
  assert.equal(isValid, true);
});

// 23. Phase 5.3.1: Language mismatch handling & retry failure
test("Phase 5.3.1: GenerateVideoScriptUseCase throws AI_DIRECTOR_LANGUAGE_MISMATCH when purely English dialogue returned for Telugu project", async () => {
  const { mockProjectRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Telugu Language Test Proj", language: "te" });

  const englishOnlyAiProvider = {
    async chat() {
      return { message: { content: 'AI Robot: "Hello, I am here to help you today!" Developer: "Great, another AI assistant."' } };
    },
  };

  const generateScript = new GenerateVideoScriptUseCase({
    videoProjectRepository: mockProjectRepo,
    aiProviderFactory: { getProvider: async () => englishOnlyAiProvider },
  });

  await assert.rejects(
    async () => generateScript.execute({ organizationId: "org-1", projectId: project.id, language: "te", forceRegenerate: true }),
    (err) => {
      assert.equal(err instanceof AppError, true);
      assert.equal(err.errorCode, "AI_DIRECTOR_LANGUAGE_MISMATCH");
      return true;
    }
  );

  const projectAfter = await mockProjectRepo.findById(project.id);
  assert.equal(projectAfter.status, AI_VIDEO_PROJECT_STATUS.FAILED);
});

// 24. Phase 5.3.1: Mixed technical terminology in Telugu script passes validation
test("Phase 5.3.1: validateSpokenLanguage accepts Telugu dialogue containing English technical terms", () => {
  const teluguWithTech = "ఈ AI అండ్ API ద్వారా కొత్త Flutter app లోని bug ని developer సులభంగా ఫిక్స్ చేయవచ్చు!";
  const isValid = validateSpokenLanguage(teluguWithTech, "te");
  assert.equal(isValid, true);
});

// 25. Phase 5.3.1: Existing script preservation on language mismatch failure
test("Phase 5.3.1: Previous successful script remains unchanged if regeneration fails due to language mismatch", async () => {
  const { mockProjectRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Preserve Script Language Test", language: "te" });

  let shouldReturnEnglish = false;
  const mockAiProvider = {
    async chat() {
      if (shouldReturnEnglish) {
        return { message: { content: 'Developer: "This is purely English text for a Telugu project."' } };
      }
      return { message: { content: 'Developer: "ఈ AI నిజంగా నాకు హెల్ప్ చేస్తుందా?"' } };
    },
  };

  const generateScript = new GenerateVideoScriptUseCase({
    videoProjectRepository: mockProjectRepo,
    aiProviderFactory: { getProvider: async () => mockAiProvider },
  });

  // 1. Initial success in Telugu
  const res1 = await generateScript.execute({ organizationId: "org-1", projectId: project.id, language: "te" });
  assert.match(res1.script, /ఈ AI/);
  assert.equal(res1.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // 2. Trigger regeneration with English provider response
  shouldReturnEnglish = true;
  await assert.rejects(
    async () => generateScript.execute({ organizationId: "org-1", projectId: project.id, language: "te", forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_LANGUAGE_MISMATCH"
  );

  // 3. Verify status is FAILED but previous Telugu script is preserved
  const projectAfter = await mockProjectRepo.findById(project.id);
  assert.equal(projectAfter.status, AI_VIDEO_PROJECT_STATUS.FAILED);
  assert.match(projectAfter.script, /ఈ AI/);
});

// 26. Phase 5.3.1: Storyboard Markdown Code Fence Cleaning & Timeline Duration Validation
test("Phase 5.3.1: StoryboardValidator handles Markdown fenced JSON and rejects invalid timeline bounds", () => {
  // 1. Markdown code block enclosed JSON
  const fencedJson = "```json\n" + JSON.stringify({
    title: "Fenced Video",
    duration: 30,
    scenes: [
      { sceneNumber: 1, startTime: 0, endTime: 15, duration: 15, visualPrompt: "Lab setup", dialogue: "Hi" },
      { sceneNumber: 2, startTime: 15, endTime: 30, duration: 15, visualPrompt: "Outro", dialogue: "Bye" },
    ],
  }) + "\n```";

  const validated = StoryboardValidator.validate(fencedJson, 30);
  assert.equal(validated.title, "Fenced Video");
  assert.equal(validated.scenes.length, 2);
  assert.equal(validated.scenes[0].startTime, 0);
  assert.equal(validated.scenes[0].endTime, 15);
  assert.equal(validated.scenes[1].startTime, 15);
  assert.equal(validated.scenes[1].endTime, 30);

  // 2. Overlapping timeline should throw AI_DIRECTOR_INVALID_RESPONSE
  const overlappingJson = JSON.stringify({
    title: "Overlapping Video",
    duration: 30,
    scenes: [
      { sceneNumber: 1, startTime: 0, endTime: 15, duration: 15, visualPrompt: "Scene 1" },
      { sceneNumber: 2, startTime: 10, endTime: 25, duration: 15, visualPrompt: "Overlapping Scene 2" },
    ],
  });

  assert.throws(
    () => StoryboardValidator.validate(overlappingJson, 30),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE"
  );
});

// 27. Phase 5.4: Comprehensive Backend Normalization Layer & Duration Tolerance Validation
test("Phase 5.4: normalizeScriptContent supports all Phase 5.4 input shapes and StoryboardValidator enforces duration tolerance", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Phase 5.4 Normalization Proj", duration: 30 });

  let responseToReturn;
  const mockAiProvider = {
    async chat() {
      return responseToReturn;
    },
  };

  const generateScript = new GenerateVideoScriptUseCase({
    videoProjectRepository: mockProjectRepo,
    aiProviderFactory: { getProvider: async () => mockAiProvider },
  });

  const generateStoryboard = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: { getProvider: async () => mockAiProvider },
  });

  // 1. Plain string response
  responseToReturn = "Phase 5.4 Plain string script";
  const res1 = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.equal(res1.script, "Phase 5.4 Plain string script");

  // 2. { scriptContent: string }
  responseToReturn = { scriptContent: "Phase 5.4 scriptContent unwrapped" };
  const res2 = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.equal(res2.script, "Phase 5.4 scriptContent unwrapped");

  // 3. { script: string }
  responseToReturn = { script: "Phase 5.4 script unwrapped" };
  const res3 = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.equal(res3.script, "Phase 5.4 script unwrapped");

  // 4. { content: string }
  responseToReturn = { content: "Phase 5.4 content unwrapped" };
  const res4 = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.equal(res4.script, "Phase 5.4 content unwrapped");

  // 5. Structured script object
  responseToReturn = { title: "Structured Title", hook: "Great Hook", scenes: [{ sceneNumber: 1, visualPrompt: "Visual", dialogue: "Hello" }] };
  const res5 = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.match(res5.script, /Structured Title/);

  // 6. Markdown JSON
  responseToReturn = "```json\n" + JSON.stringify({ title: "Markdown Fenced Script", hook: "Fenced Hook", scenes: [{ sceneNumber: 1, text: "Fenced Text" }] }) + "\n```";
  const res6 = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true });
  assert.match(res6.script, /Markdown Fenced Script/);

  // 7. Malformed response -> AI_DIRECTOR_INVALID_RESPONSE
  responseToReturn = { invalidKeyOnly: true };
  await assert.rejects(
    async () => generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE"
  );

  // 8. Null / Undefined response -> AI_DIRECTOR_INVALID_RESPONSE
  responseToReturn = null;
  await assert.rejects(
    async () => generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE"
  );

  // 9. Duration tolerance validation failure (10s total scene duration across multiple scenes for 30s project)
  responseToReturn = JSON.stringify({
    title: "Short Duration Video",
    duration: 10,
    scenes: [
      { sceneNumber: 1, duration: 5, visualPrompt: "Visual 1", dialogue: "Hi" },
      { sceneNumber: 2, duration: 5, visualPrompt: "Visual 2", dialogue: "Bye" },
    ],
  });
  await assert.rejects(
    async () => generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id, targetDuration: 30, forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE"
  );

  // 10. Duration tolerance validation success (30s total scene duration for 30s project)
  responseToReturn = JSON.stringify({
    title: "Exact Duration Video",
    duration: 30,
    scenes: [
      { sceneNumber: 1, startTime: 0, endTime: 15, duration: 15, visualPrompt: "Visual 1", dialogue: "Hi" },
      { sceneNumber: 2, startTime: 15, endTime: 30, duration: 15, visualPrompt: "Visual 2", dialogue: "Bye" },
    ],
  });
  const resDurationOk = await generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id, targetDuration: 30, forceRegenerate: true });
  assert.equal(resDurationOk.storyboard.duration, 30);

  // 11. Idempotency test (forceRegenerate: false)
  const resIdempotent = await generateScript.execute({ organizationId: "org-1", projectId: project.id, forceRegenerate: false });
  assert.equal(resIdempotent.script, res6.script);
});

// 28. Phase 5.5: Fix Script -> Storyboard Pipeline End-to-End Tests (Requirements 1 - 10)
test("Phase 5.5: Complete Script -> Storyboard Pipeline Verification", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const getProj = new GetVideoProjectUseCase({ videoProjectRepository: mockProjectRepo, videoSceneRepository: mockSceneRepo });

  let responseToReturn;
  const mockAiProvider = {
    name: "ollama-mock",
    async chat() {
      return responseToReturn;
    },
  };

  const generateScript = new GenerateVideoScriptUseCase({
    videoProjectRepository: mockProjectRepo,
    aiProviderFactory: { getProvider: async () => mockAiProvider },
  });

  const generateStoryboard = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: { getProvider: async () => mockAiProvider },
  });

  const project = await createProj.execute({
    organizationId: "org-1",
    createdById: "u1",
    name: "Phase 5.5 Test Project",
    duration: 30,
    language: "en",
    style: "cartoon",
  });

  // Test 1: Script successfully generated and persisted
  responseToReturn = "[Scene 1: Intro]\nNarrator: Welcome to Phase 5.5.\n[Scene 2: Outro]\nNarrator: Conclusion.";
  const scriptRes = await generateScript.execute({ organizationId: "org-1", projectId: project.id });
  assert.equal(typeof scriptRes.script, "string");
  assert.equal(scriptRes.script.trim().length > 0, true);
  const projAfterScript = await mockProjectRepo.findById(project.id);
  assert.equal(projAfterScript.script, scriptRes.script.trim());
  assert.equal(projAfterScript.status, AI_VIDEO_PROJECT_STATUS.READY);

  // Test 2 & 3 & 4: Storyboard receives persisted script, creates non-empty scenes & persists to project.storyboard
  responseToReturn = JSON.stringify({
    title: "Phase 5.5 Storyboard",
    synopsis: "Test synopsis",
    duration: 30,
    scenes: [
      { sceneNumber: 1, startTime: 0, endTime: 15, duration: 15, visualPrompt: "Visual 1", motionPrompt: "Zoom in", dialogue: "Welcome to Phase 5.5", speaker: "Narrator" },
      { sceneNumber: 2, startTime: 15, endTime: 30, duration: 15, visualPrompt: "Visual 2", motionPrompt: "Pan right", dialogue: "Conclusion", speaker: "Narrator" },
    ],
  });

  const sbRes = await generateStoryboard.execute({
    organizationId: "org-1",
    createdById: "u1",
    projectId: project.id,
    targetDuration: 30,
  });

  assert.equal(sbRes.storyboard.scenes.length, 2);
  assert.equal(sbRes.project.status, AI_VIDEO_PROJECT_STATUS.READY);
  const projAfterSb = await mockProjectRepo.findById(project.id);
  assert.equal(projAfterSb.storyboard.scenes.length, 2);
  assert.equal(projAfterSb.storyboard.title, "Phase 5.5 Storyboard");

  // Test 5 & 9: Fresh GET project returns storyboard scenes & project.storyboard.scenes
  const getRes = await getProj.execute({ organizationId: "org-1", projectId: project.id });
  assert.equal(getRes.project.storyboard.scenes.length, 2);
  assert.equal(getRes.scenes.length, 2);
  assert.equal(getRes.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // Test 6: Invalid empty storyboard fails & sets status FAILED
  responseToReturn = JSON.stringify({ title: "Empty Scenes Storyboard", scenes: [] });
  await assert.rejects(
    async () => generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id, forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE"
  );
  const projAfterEmptySb = await mockProjectRepo.findById(project.id);
  assert.equal(projAfterEmptySb.status, AI_VIDEO_PROJECT_STATUS.FAILED);

  // Test 7: Malformed AI storyboard response fails
  responseToReturn = "{ invalidJsonString ";
  await assert.rejects(
    async () => generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id, forceRegenerate: true }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_INVALID_RESPONSE"
  );

  // Test 8: 30-second project produces scenes covering approximately 30 seconds
  responseToReturn = JSON.stringify({
    title: "30s Storyboard",
    duration: 30,
    scenes: [
      { sceneNumber: 1, startTime: 0, endTime: 10, duration: 10, visualPrompt: "Scene 1", dialogue: "D1" },
      { sceneNumber: 2, startTime: 10, endTime: 20, duration: 10, visualPrompt: "Scene 2", dialogue: "D2" },
      { sceneNumber: 3, startTime: 20, endTime: 30, duration: 10, visualPrompt: "Scene 3", dialogue: "D3" },
    ],
  });
  const res30s = await generateStoryboard.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id, targetDuration: 30, forceRegenerate: true });
  assert.equal(res30s.storyboard.duration, 30);
  assert.equal(res30s.storyboard.scenes.reduce((acc, s) => acc + s.duration, 0), 30);

  // Test 10: Status transitions to READY on completion (polling stops)
  assert.equal(res30s.project.status, AI_VIDEO_PROJECT_STATUS.READY);
});

// 29. Phase 5.6: Provider Failure Handling & Fallback Chain Tests
test("Phase 5.6: Primary provider 503/capacity fallback and retry policies", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const getProj = new GetVideoProjectUseCase({ videoProjectRepository: mockProjectRepo, videoSceneRepository: mockSceneRepo });

  const validStoryboardJson = JSON.stringify({
    title: "Fallback Storyboard",
    duration: 30,
    scenes: [
      { sceneNumber: 1, startTime: 0, endTime: 15, duration: 15, visualPrompt: "Scene 1", dialogue: "Hello" },
      { sceneNumber: 2, startTime: 15, endTime: 30, duration: 15, visualPrompt: "Scene 2", dialogue: "World" },
    ],
  });

  // Test 1: Primary provider succeeds
  const proj1 = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "P1", duration: 30 });
  await mockProjectRepo.update(proj1.id, { script: "Sample script content" });

  let primaryAttempts = 0;
  const primaryProviderSuccess = {
    name: "primary-gemini",
    model: "gemini-3.6-flash-high",
    async chat() {
      primaryAttempts++;
      return validStoryboardJson;
    },
  };

  const sbUsecase1 = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: { getProvider: async () => primaryProviderSuccess },
  });

  const res1 = await sbUsecase1.execute({ organizationId: "org-1", createdById: "u1", projectId: proj1.id });
  assert.equal(res1.project.status, AI_VIDEO_PROJECT_STATUS.READY);
  assert.equal(primaryAttempts, 1);

  // Test 2 & 11: Primary provider returns 503 (No capacity) -> fallback succeeds without infinite loop
  const proj2 = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "P2", duration: 30 });
  await mockProjectRepo.update(proj2.id, { script: "Sample script content" });

  let primaryFailCount = 0;
  let fallbackAttempts = 0;

  const failingGeminiProvider = {
    name: "gemini",
    model: "gemini-3.6-flash-high",
    async chat() {
      primaryFailCount++;
      const err = new Error("API error (attempt 1): UNAVAILABLE (code 503): No capacity available for model gemini-3.6-flash-high");
      err.status = 503;
      err.code = "UNAVAILABLE";
      throw err;
    },
  };

  const successfulOllamaProvider = {
    name: "ollama",
    model: "qwen3:8b",
    async chat() {
      fallbackAttempts++;
      return validStoryboardJson;
    },
  };

  const sbUsecase2 = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: {
      getProvider: async () => failingGeminiProvider,
      getProviderByName: (name) => (name === "ollama" ? successfulOllamaProvider : failingGeminiProvider),
    },
  });

  const res2 = await sbUsecase2.execute({ organizationId: "org-1", createdById: "u1", projectId: proj2.id });
  assert.equal(res2.project.status, AI_VIDEO_PROJECT_STATUS.READY);
  assert.equal(res2.storyboard.scenes.length, 2);
  assert.equal(primaryFailCount, 2); // Primary tried max 2 times (attempt 1 + retry)
  assert.equal(fallbackAttempts, 1); // Fallback tried exactly 1 time (no infinite loop)

  // Test 3: Primary returns RESOURCE_EXHAUSTED capacity error -> fallback succeeds
  const proj3 = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "P3", duration: 30 });
  await mockProjectRepo.update(proj3.id, { script: "Sample script content" });

  const resourceExhaustedProvider = {
    name: "primary",
    async chat() {
      const err = new Error("RESOURCE_EXHAUSTED: Rate limit reached or quota exceeded");
      err.code = "RESOURCE_EXHAUSTED";
      throw err;
    },
  };

  const sbUsecase3 = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: {
      getProvider: async () => resourceExhaustedProvider,
      fallbackProvider: successfulOllamaProvider,
    },
  });

  const res3 = await sbUsecase3.execute({ organizationId: "org-1", createdById: "u1", projectId: proj3.id });
  assert.equal(res3.project.status, AI_VIDEO_PROJECT_STATUS.READY);

  // Test 4: Primary times out -> timeout behavior works without fallback
  const proj4 = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "P4", duration: 30 });
  await mockProjectRepo.update(proj4.id, { script: "Sample script content" });

  let fallbackCalledOnTimeout = false;
  const timeoutProvider = {
    name: "timeout-primary",
    async chat() {
      const err = new Error("AI request timed out after 300000ms");
      err.code = "AI_DIRECTOR_TIMEOUT";
      throw err;
    },
  };

  const unusedFallback = {
    name: "unused-fallback",
    async chat() {
      fallbackCalledOnTimeout = true;
      return validStoryboardJson;
    },
  };

  const sbUsecase4 = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: {
      getProvider: async () => timeoutProvider,
      fallbackProvider: unusedFallback,
    },
  });

  await assert.rejects(
    async () => sbUsecase4.execute({ organizationId: "org-1", createdById: "u1", projectId: proj4.id }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_TIMEOUT"
  );
  assert.equal(fallbackCalledOnTimeout, false);
  const proj4After = await mockProjectRepo.findById(proj4.id);
  assert.equal(proj4After.status, AI_VIDEO_PROJECT_STATUS.FAILED);

  // Test 5 & 10: Primary + fallback both fail -> project becomes FAILED
  const proj5 = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "P5", duration: 30 });
  await mockProjectRepo.update(proj5.id, { script: "Sample script content" });

  const failingFallback = {
    name: "failing-fallback",
    async chat() {
      throw new Error("Fallback connection refused (503)");
    },
  };

  const sbUsecase5 = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: {
      getProvider: async () => failingGeminiProvider,
      fallbackProvider: failingFallback,
    },
  });

  await assert.rejects(
    async () => sbUsecase5.execute({ organizationId: "org-1", createdById: "u1", projectId: proj5.id }),
    (err) => err instanceof AppError
  );
  const proj5After = await mockProjectRepo.findById(proj5.id);
  assert.equal(proj5After.status, AI_VIDEO_PROJECT_STATUS.FAILED);
  assert.equal(typeof proj5After.errorMessage, "string");

  // Test 6: Previous storyboard remains intact when regeneration fails
  const proj6 = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "P6", duration: 30 });
  await mockProjectRepo.update(proj6.id, {
    script: "Sample script content",
    storyboard: { title: "Preserved Initial Storyboard", scenes: [{ sceneNumber: 1, duration: 30 }] },
    status: AI_VIDEO_PROJECT_STATUS.READY,
  });

  const sbUsecase6 = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: {
      getProvider: async () => failingGeminiProvider,
      fallbackProvider: failingFallback,
    },
  });

  await assert.rejects(
    async () => sbUsecase6.execute({ organizationId: "org-1", createdById: "u1", projectId: proj6.id, forceRegenerate: true }),
    (err) => err instanceof AppError
  );

  const proj6After = await mockProjectRepo.findById(proj6.id);
  assert.equal(proj6After.status, AI_VIDEO_PROJECT_STATUS.FAILED);
  assert.equal(proj6After.storyboard.title, "Preserved Initial Storyboard");
});

// 30. Regression: OllamaProvider implements name and model getters without throwing
test("Regression: OllamaProvider implements name and model getters without throwing", () => {
  const mockConfigUseCase = {
    async getValue(key) {
      if (key === "OLLAMA_MODEL") return "qwen3:8b";
      return null;
    },
  };
  const provider = new OllamaProvider({ getPlatformConfigUseCase: mockConfigUseCase, defaultModel: "qwen3:8b" });
  assert.equal(provider.name, "ollama");
  assert.equal(provider.model, "qwen3:8b");
});

// 31. Regression: GenerateVideoStoryboardUseCase reaches provider.chat() with OllamaProvider without throwing "Method not implemented"
test("Regression: GenerateVideoStoryboardUseCase accesses provider.model without throwing Method not implemented and reaches provider.chat()", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo } = createMockRepositories();
  const createProj = new CreateVideoProjectUseCase({ videoProjectRepository: mockProjectRepo });
  const project = await createProj.execute({ organizationId: "org-1", createdById: "u1", name: "Ollama Model Test", duration: 30 });
  await mockProjectRepo.update(project.id, { script: "Sample script content" });

  let chatReached = false;
  class TestOllamaProvider extends OllamaProvider {
    constructor() {
      super({
        getPlatformConfigUseCase: { async getValue() { return null; } },
        defaultModel: "qwen3:8b",
      });
    }

    async chat() {
      chatReached = true;
      return JSON.stringify({
        title: "Ollama Storyboard",
        duration: 30,
        scenes: [{ sceneNumber: 1, startTime: 0, endTime: 30, duration: 30, visualPrompt: "Prompt", dialogue: "Hi" }],
      });
    }
  }

  const testProvider = new TestOllamaProvider();
  assert.equal(testProvider.name, "ollama");
  assert.equal(testProvider.model, "qwen3:8b");

  const usecase = new GenerateVideoStoryboardUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    aiProviderFactory: { getProvider: async () => testProvider },
  });

  const res = await usecase.execute({ organizationId: "org-1", createdById: "u1", projectId: project.id });
  assert.equal(chatReached, true);
  assert.equal(res.project.status, AI_VIDEO_PROJECT_STATUS.READY);
  assert.equal(res.storyboard.title, "Ollama Storyboard");
});

// ============================================================================
// PHASE 5.7 TESTS — AI Video Scene Image Generation
// ============================================================================

test("Phase 5.7 - Test 1: Scene image generation succeeds", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "AI Promo",
    prompt: "Tech future",
    style: "3d-cartoon",
    aspectRatio: "9:16",
    storyboard: {
      title: "AI Promo",
      scenes: [{ sceneNumber: 1, duration: 5, visualPrompt: "Futuristic robot on desk" }],
    },
  });

  const scene = await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    duration: 5,
    visualPrompt: "Futuristic robot on desk",
    status: AI_VIDEO_SCENE_STATUS.PENDING,
  });

  let providerCalled = false;
  const mockImageProvider = {
    name: "test-image-provider",
    async generateImage({ prompt, aspectRatio, style }) {
      providerCalled = true;
      assert.ok(prompt.includes("Futuristic robot on desk"));
      return {
        provider: "test-image-provider",
        providerJobId: "job-1",
        status: "COMPLETED",
        assetUrl: "https://storage.shaivik.ai/generated/scene-1.png",
        metadata: { width: 1024, height: 1792 },
      };
    },
  };

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => mockImageProvider },
  });

  const res = await useCase.execute({
    organizationId: "org-1",
    projectId: project.id,
    sceneNumber: 1,
  });

  assert.equal(providerCalled, true);
  assert.equal(res.success, true);
  assert.equal(res.imageUrl, "https://storage.shaivik.ai/generated/scene-1.png");
  assert.equal(res.imageStatus, "READY");

  const updatedScene = await mockSceneRepo.findById(scene.id);
  assert.equal(updatedScene.referenceImageUrl, "https://storage.shaivik.ai/generated/scene-1.png");
  assert.equal(updatedScene.status, "READY");
});

test("Phase 5.7 - Test 2: Missing project fails with AI_VIDEO_PROJECT_NOT_FOUND", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => ({}) },
  });

  await assert.rejects(
    async () =>
      useCase.execute({
        organizationId: "org-1",
        projectId: "non-existent-proj",
        sceneNumber: 1,
      }),
    (err) => err instanceof AppError && err.errorCode === "AI_VIDEO_PROJECT_NOT_FOUND" && err.statusCode === 404,
  );
});

test("Phase 5.7 - Test 3: Missing storyboard fails with AI_DIRECTOR_STORYBOARD_REQUIRED", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Empty Storyboard Project",
    storyboard: null,
  });

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => ({}) },
  });

  await assert.rejects(
    async () =>
      useCase.execute({
        organizationId: "org-1",
        projectId: project.id,
        sceneNumber: 1,
      }),
    (err) => err instanceof AppError && err.errorCode === "AI_DIRECTOR_STORYBOARD_REQUIRED" && err.statusCode === 400,
  );
});

test("Phase 5.7 - Test 4: Invalid scene number fails with AI_VIDEO_SCENE_NOT_FOUND", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Valid Project",
    storyboard: {
      scenes: [{ sceneNumber: 1, visualPrompt: "Scene 1" }],
    },
  });

  await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "Scene 1",
  });

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => ({}) },
  });

  await assert.rejects(
    async () =>
      useCase.execute({
        organizationId: "org-1",
        projectId: project.id,
        sceneNumber: 99,
      }),
    (err) => err instanceof AppError && err.errorCode === "AI_VIDEO_SCENE_NOT_FOUND" && err.statusCode === 404,
  );
});

test("Phase 5.7 - Test 5: Missing visual prompt fails with AI_IMAGE_PROMPT_REQUIRED", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Valid Project",
    storyboard: {
      scenes: [{ sceneNumber: 1, visualPrompt: " " }],
    },
  });

  await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "   ",
  });

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => ({}) },
  });

  await assert.rejects(
    async () =>
      useCase.execute({
        organizationId: "org-1",
        projectId: project.id,
        sceneNumber: 1,
      }),
    (err) => err instanceof AppError && err.errorCode === "AI_IMAGE_PROMPT_REQUIRED" && err.statusCode === 400,
  );
});

test("Phase 5.7 - Test 6: Existing image + forceRegenerate=false does not call provider", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Existing Image Project",
    storyboard: {
      scenes: [{ sceneNumber: 1, visualPrompt: "Desk setup" }],
    },
  });

  await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "Desk setup",
    referenceImageUrl: "https://storage.shaivik.ai/existing-image.png",
    status: "READY",
  });

  let providerCalled = false;
  const mockImageProvider = {
    async generateImage() {
      providerCalled = true;
      return { assetUrl: "https://storage.shaivik.ai/new.png" };
    },
  };

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => mockImageProvider },
  });

  const res = await useCase.execute({
    organizationId: "org-1",
    projectId: project.id,
    sceneNumber: 1,
    forceRegenerate: false,
  });

  assert.equal(providerCalled, false);
  assert.equal(res.reused, true);
  assert.equal(res.imageUrl, "https://storage.shaivik.ai/existing-image.png");
});

test("Phase 5.7 - Test 7: forceRegenerate=true calls provider and replaces image", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Regeneration Project",
    storyboard: {
      scenes: [{ sceneNumber: 1, visualPrompt: "Desk setup" }],
    },
  });

  await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "Desk setup",
    referenceImageUrl: "https://storage.shaivik.ai/old.png",
    status: "READY",
  });

  let providerCalled = false;
  const mockImageProvider = {
    async generateImage() {
      providerCalled = true;
      return {
        provider: "mock",
        status: "COMPLETED",
        assetUrl: "https://storage.shaivik.ai/new-regenerated.png",
      };
    },
  };

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => mockImageProvider },
  });

  const res = await useCase.execute({
    organizationId: "org-1",
    projectId: project.id,
    sceneNumber: 1,
    forceRegenerate: true,
  });

  assert.equal(providerCalled, true);
  assert.equal(res.reused, false);
  assert.equal(res.imageUrl, "https://storage.shaivik.ai/new-regenerated.png");
});

test("Phase 5.7 - Test 8: Provider failure marks scene as FAILED", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Failing Provider Project",
    storyboard: {
      scenes: [{ sceneNumber: 1, visualPrompt: "Desk setup" }],
    },
  });

  const scene = await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "Desk setup",
    status: AI_VIDEO_SCENE_STATUS.PENDING,
  });

  const mockFailingProvider = {
    async generateImage() {
      throw new Error("DALL-E service error 500");
    },
  };

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => mockFailingProvider },
  });

  await assert.rejects(
    async () =>
      useCase.execute({
        organizationId: "org-1",
        projectId: project.id,
        sceneNumber: 1,
      }),
    (err) => err instanceof AppError && err.errorCode === "AI_IMAGE_GENERATION_FAILED",
  );

  const updatedScene = await mockSceneRepo.findById(scene.id);
  assert.equal(updatedScene.status, AI_VIDEO_SCENE_STATUS.FAILED);
  assert.ok(updatedScene.errorMessage.includes("DALL-E service error"));
});

test("Phase 5.7 - Test 9: Previous image remains after regeneration failure", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Preserve Old Image Project",
    storyboard: {
      scenes: [{ sceneNumber: 1, visualPrompt: "Desk setup" }],
    },
  });

  const scene = await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "Desk setup",
    referenceImageUrl: "https://storage.shaivik.ai/v1-good-image.png",
    status: "READY",
  });

  const mockFailingProvider = {
    async generateImage() {
      throw new Error("Temporary rate limit exceeded");
    },
  };

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => mockFailingProvider },
  });

  await assert.rejects(
    async () =>
      useCase.execute({
        organizationId: "org-1",
        projectId: project.id,
        sceneNumber: 1,
        forceRegenerate: true,
      }),
    (err) => err instanceof AppError,
  );

  const updatedScene = await mockSceneRepo.findById(scene.id);
  assert.equal(updatedScene.status, AI_VIDEO_SCENE_STATUS.FAILED);
  assert.equal(updatedScene.referenceImageUrl, "https://storage.shaivik.ai/v1-good-image.png");
});

test("Phase 5.7 - Test 10: Successful generation changes status to READY", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Status Ready Project",
    storyboard: {
      scenes: [{ sceneNumber: 1, visualPrompt: "Neon city skyline" }],
    },
  });

  const scene = await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "Neon city skyline",
    status: AI_VIDEO_SCENE_STATUS.PENDING,
  });

  const mockProvider = {
    async generateImage() {
      return {
        provider: "test-provider",
        status: "COMPLETED",
        assetUrl: "https://storage.shaivik.ai/city.png",
      };
    },
  };

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => mockProvider },
  });

  const res = await useCase.execute({
    organizationId: "org-1",
    projectId: project.id,
    sceneNumber: 1,
  });

  assert.equal(res.imageStatus, "READY");
  const updatedScene = await mockSceneRepo.findById(scene.id);
  assert.equal(updatedScene.status, "READY");
});

test("Phase 5.7 - Test 11: Provider response is normalized correctly", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Normalization Project",
    storyboard: {
      scenes: [{ sceneNumber: 1, visualPrompt: "Character intro" }],
    },
  });

  await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "Character intro",
  });

  const mockProvider = {
    async generateImage() {
      return {
        provider: "openai-image-provider",
        providerJobId: "dalle-999",
        status: "COMPLETED",
        assetUrl: "https://storage.shaivik.ai/permanent/dalle-normalized.png",
        metadata: { prompt: "Custom prompt", width: 1024, height: 1792, model: "dall-e-3" },
      };
    },
  };

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => mockProvider },
  });

  const res = await useCase.execute({
    organizationId: "org-1",
    projectId: project.id,
    sceneNumber: 1,
  });

  assert.equal(res.success, true);
  assert.equal(res.imageUrl, "https://storage.shaivik.ai/permanent/dalle-normalized.png");
  assert.equal(res.imageStatus, "READY");
  assert.equal(res.reused, false);
});

test("Phase 5.7 - Test 12: API returns generated image URL", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "API Test Project",
    storyboard: {
      scenes: [{ sceneNumber: 1, visualPrompt: "Studio test" }],
    },
  });

  await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "Studio test",
  });

  const mockProvider = {
    async generateImage() {
      return {
        provider: "test-provider",
        status: "COMPLETED",
        assetUrl: "https://storage.shaivik.ai/api-result.png",
      };
    },
  };

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => mockProvider },
  });

  const controller = new VideoSceneController({
    createVideoSceneUseCase: {},
    updateVideoSceneUseCase: {},
    deleteVideoSceneUseCase: {},
    updateSceneStatusUseCase: {},
    generateVideoSceneImageUseCase: useCase,
  });

  let responseData = null;
  const mockReq = {
    params: { projectId: project.id, sceneNumber: "1" },
    context: { organizationId: "org-1" },
    body: { forceRegenerate: false },
  };
  const mockRes = {
    json(data) {
      responseData = data;
      return this;
    },
  };

  await controller.generateImage(mockReq, mockRes);

  assert.ok(responseData);
  assert.equal(responseData.success, true);
  assert.equal(responseData.scene.sceneNumber, 1);
  assert.equal(responseData.scene.imageUrl, "https://storage.shaivik.ai/api-result.png");
  assert.equal(responseData.scene.imageStatus, "READY");
});

test("Phase 5.7 - Test 13: Generate-all skips already generated scenes", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Batch Project",
    storyboard: {
      scenes: [
        { sceneNumber: 1, visualPrompt: "Scene 1" },
        { sceneNumber: 2, visualPrompt: "Scene 2" },
        { sceneNumber: 3, visualPrompt: "Scene 3" },
      ],
    },
  });

  await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "Scene 1",
    referenceImageUrl: "https://storage.shaivik.ai/scene-1.png",
    status: "READY",
  });

  await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 2,
    visualPrompt: "Scene 2",
    status: AI_VIDEO_SCENE_STATUS.PENDING,
  });

  await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 3,
    visualPrompt: "Scene 3",
    status: AI_VIDEO_SCENE_STATUS.PENDING,
  });

  const mockProvider = {
    async generateImage() {
      return {
        provider: "batch-provider",
        status: "COMPLETED",
        assetUrl: "https://storage.shaivik.ai/generated.png",
      };
    },
  };

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => mockProvider },
  });

  const res = await useCase.executeBatch({
    organizationId: "org-1",
    projectId: project.id,
    forceRegenerate: false,
    concurrency: 2,
  });

  assert.equal(res.success, true);
  assert.equal(res.total, 3);
  assert.equal(res.skipped, 1);
  assert.equal(res.generated, 2);
});

test("Phase 5.7 - Test 14: Generate-all respects controlled concurrency", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Concurrency Project",
    storyboard: {
      scenes: [
        { sceneNumber: 1, visualPrompt: "Scene 1" },
        { sceneNumber: 2, visualPrompt: "Scene 2" },
        { sceneNumber: 3, visualPrompt: "Scene 3" },
        { sceneNumber: 4, visualPrompt: "Scene 4" },
      ],
    },
  });

  for (let i = 1; i <= 4; i++) {
    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: i,
      visualPrompt: `Scene ${i}`,
    });
  }

  let activeConcurrentCalls = 0;
  let maxConcurrentCallsSeen = 0;

  const mockProvider = {
    async generateImage() {
      activeConcurrentCalls++;
      if (activeConcurrentCalls > maxConcurrentCallsSeen) {
        maxConcurrentCallsSeen = activeConcurrentCalls;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
      activeConcurrentCalls--;
      return {
        provider: "test",
        status: "COMPLETED",
        assetUrl: "https://storage.shaivik.ai/test.png",
      };
    },
  };

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => mockProvider },
  });

  const res = await useCase.executeBatch({
    organizationId: "org-1",
    projectId: project.id,
    forceRegenerate: true,
    concurrency: 2,
  });

  assert.equal(res.success, true);
  assert.equal(res.total, 4);
  assert.equal(res.generated, 4);
  assert.ok(maxConcurrentCallsSeen <= 2, `Expected max concurrency <= 2, saw ${maxConcurrentCallsSeen}`);
});

test("Phase 5.7 - Test 15: No API secrets are returned", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Secret Leak Protection Project",
    storyboard: {
      scenes: [{ sceneNumber: 1, visualPrompt: "Secret test" }],
    },
  });

  await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "Secret test",
  });

  const mockLeakingProvider = {
    async generateImage() {
      throw new Error("Failed connecting with key=sk-secretapikey1234567890 and Bearer eyJhbGciOiJIUzI1NiJ9.leak");
    },
  };

  const useCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => mockLeakingProvider },
  });

  await assert.rejects(
    async () =>
      useCase.execute({
        organizationId: "org-1",
        projectId: project.id,
        sceneNumber: 1,
      }),
    (err) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.message.includes("sk-secretapikey1234567890"), false);
      assert.equal(err.message.includes("eyJhbGciOiJIUzI1NiJ9"), false);
      assert.ok(err.message.includes("[REDACTED]"));
      return true;
    },
  );
});








