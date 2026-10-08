import test from "node:test";
import assert from "node:assert/strict";

import { VideoProviderFactory } from "./video-provider.factory.js";
import { ExistingTtsVideoAdapter } from "../../infrastructure/tts/existing-tts-video.adapter.js";
import { VideoGenerationOrchestrator } from "./video-generation.orchestrator.js";
import { GenerateVideoSceneStageUseCase } from "../use-cases/generate-video-scene-stage.usecase.js";
import { RetryVideoSceneStageUseCase } from "../use-cases/retry-video-scene-stage.usecase.js";
import { CalculateVideoProjectProgressUseCase } from "../use-cases/calculate-video-project-progress.usecase.js";

import {
  AI_VIDEO_SCENE_STATUS,
  AI_VIDEO_PROJECT_STATUS,
  AI_VIDEO_ASSET_TYPE,
} from "../../domain/constants/ai-video.constants.js";
import { AppError } from "../../../../common/errors/AppError.js";

// Mock Repositories Store for Orchestrator Tests
function createMockRepositories() {
  const projects = new Map();
  const scenes = new Map();
  const characters = new Map();
  const assets = new Map();

  const mockProjectRepo = {
    async create(data) {
      const id = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const entity = {
        id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
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
      const updated = {
        ...existing,
        status,
        ...extraPayload,
        updatedAt: new Date(),
      };
      projects.set(id, updated);
      return updated;
    },
  };

  const mockSceneRepo = {
    async create(data) {
      const id = `scene-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const entity = {
        id,
        status: AI_VIDEO_SCENE_STATUS.PENDING,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      scenes.set(id, entity);
      return entity;
    },
    async findById(id) {
      return scenes.get(id) || null;
    },
    async findByProjectId(videoProjectId) {
      return Array.from(scenes.values())
        .filter((s) => s.videoProjectId === videoProjectId)
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
      const updated = {
        ...existing,
        status,
        ...extraPayload,
        updatedAt: new Date(),
      };
      scenes.set(id, updated);
      return updated;
    },
  };

  const mockCharRepo = {
    async create(data) {
      const id = `char-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const entity = {
        id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      characters.set(id, entity);
      return entity;
    },
    async findById(id) {
      return characters.get(id) || null;
    },
  };

  const mockAssetRepo = {
    async create(data) {
      const id = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const entity = { id, ...data, createdAt: new Date() };
      assets.set(id, entity);
      return entity;
    },
    async findBySceneId(videoSceneId) {
      return Array.from(assets.values()).filter(
        (a) => a.sceneId === videoSceneId || a.videoSceneId === videoSceneId,
      );
    },
    async findBySceneIdAndType(videoSceneId, type, language = null) {
      return Array.from(assets.values()).filter((a) => {
        if (
          (a.sceneId !== videoSceneId && a.videoSceneId !== videoSceneId) ||
          a.type !== type
        )
          return false;
        if (language) return a.metadata?.language === language;
        return true;
      });
    },
  };

  return {
    mockProjectRepo,
    mockSceneRepo,
    mockCharRepo,
    mockAssetRepo,
    projects,
    scenes,
    characters,
    assets,
  };
}

// 1. VideoProviderFactory resolution tests
test("VideoProviderFactory resolves default placeholder and TTS providers correctly", () => {
  const mockSynthesizeUseCase = {
    async execute() {
      return {};
    },
  };
  const factory = new VideoProviderFactory({
    synthesizeSpeechUseCase: mockSynthesizeUseCase,
  });

  const imageProvider = factory.getImageProvider("placeholder");
  const videoProvider = factory.getVideoProvider("placeholder");
  const ttsProvider = factory.getTTSProvider("indicf5-tts-adapter");
  const lipSyncProvider = factory.getLipSyncProvider("placeholder");
  const subtitleProvider = factory.getSubtitleProvider("placeholder");
  const rendererProvider = factory.getRenderer("placeholder");

  assert.ok(imageProvider.name);
  assert.ok(videoProvider.name);
  assert.ok(ttsProvider.name);
  assert.ok(lipSyncProvider.name);
  assert.ok(subtitleProvider.name);
  assert.ok(rendererProvider.name);
});

test("VideoProviderFactory throws AppError on unconfigured TTS provider", () => {
  const factory = new VideoProviderFactory(); // no synthesizeSpeechUseCase
  assert.throws(
    () => factory.getTTSProvider("default"),
    (err) => err instanceof AppError && err.errorCode === "PROVIDER_NOT_FOUND",
  );
});

// 2. ExistingTtsVideoAdapter unit tests
test("ExistingTtsVideoAdapter invokes synthesizeSpeechUseCase with correct mapped options", async () => {
  let capturedPayload = null;
  const mockSynthesizeUseCase = {
    async execute(payload) {
      capturedPayload = payload;
      return {
        outputPath: "https://storage.shaivik.ai/audio/tts-123.wav",
        duration: 4.5,
        mimeType: "audio/wav",
      };
    },
  };

  const adapter = new ExistingTtsVideoAdapter({
    synthesizeSpeechUseCase: mockSynthesizeUseCase,
  });
  const result = await adapter.generateSpeech({
    text: "Namaste, welcome to Shaivik AI",
    language: "te",
    voice: "v1_telugu_female",
  });

  assert.equal(capturedPayload.text, "Namaste, welcome to Shaivik AI");
  assert.equal(capturedPayload.options.language, "te");
  assert.equal(capturedPayload.options.voice, "v1_telugu_female");
  assert.equal(result.assetUrl, "https://storage.shaivik.ai/audio/tts-123.wav");
  assert.equal(result.duration, 4.5);
  assert.equal(result.status, "COMPLETED");
});

test("ExistingTtsVideoAdapter handles missing synthesizeSpeechUseCase gracefully", async () => {
  const adapter = new ExistingTtsVideoAdapter({
    synthesizeSpeechUseCase: null,
  });
  await assert.rejects(
    async () => adapter.generateSpeech({ text: "Hello" }),
    (err) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.errorCode, "TTS_ADAPTER_ERROR");
      return true;
    },
  );
});

// 3. Orchestration: Complete scene stage pipeline execution
test("VideoGenerationOrchestrator executes all stages for a scene sequentially", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } =
    createMockRepositories();
  const mockSynthesizeUseCase = {
    async execute() {
      return {
        outputPath: "https://placeholder.shaivik.ai/audio.wav",
        duration: 5,
      };
    },
  };
  const providerFactory = new VideoProviderFactory({
    synthesizeSpeechUseCase: mockSynthesizeUseCase,
  });
  const calcProgress = new CalculateVideoProjectProgressUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
  });

  const orchestrator = new VideoGenerationOrchestrator({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: providerFactory,
    calculateVideoProjectProgressUseCase: calcProgress,
  });

  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Pipeline Test",
    language: "en",
    status: AI_VIDEO_PROJECT_STATUS.STORYBOARDING,
  });

  const scene = await mockSceneRepo.create({
    organizationId: "org-1",
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "A high-tech control room",
    dialogue: "Initializing systems.",
  });

  // Execute IMAGE stage
  const imgRes = await orchestrator.executeStage({
    organizationId: "org-1",
    projectId: project.id,
    sceneId: scene.id,
    stage: "IMAGE",
    options: { providerName: "placeholder" },
  });
  assert.equal(imgRes.scene.status, AI_VIDEO_SCENE_STATUS.IMAGE_READY);
  assert.ok(imgRes.assetUrl);

  // Execute VIDEO stage
  const vidRes = await orchestrator.executeStage({
    organizationId: "org-1",
    projectId: project.id,
    sceneId: scene.id,
    stage: "VIDEO",
  });
  assert.equal(vidRes.scene.status, AI_VIDEO_SCENE_STATUS.VIDEO_READY);
  assert.ok(vidRes.assetUrl);

  // Execute AUDIO stage
  const audioRes = await orchestrator.executeStage({
    organizationId: "org-1",
    projectId: project.id,
    sceneId: scene.id,
    stage: "AUDIO",
  });
  assert.equal(audioRes.scene.status, AI_VIDEO_SCENE_STATUS.TTS_READY);
  assert.ok(audioRes.assetUrl);

  // Execute LIP_SYNC stage
  const lipRes = await orchestrator.executeStage({
    organizationId: "org-1",
    projectId: project.id,
    sceneId: scene.id,
    stage: "LIP_SYNC",
  });
  assert.equal(lipRes.scene.status, AI_VIDEO_SCENE_STATUS.COMPLETED);

  // Check stored assets
  const assets = await mockAssetRepo.findBySceneId(scene.id);
  assert.ok(assets.length >= 3);
});

// 4. Idempotency & Selective Resume: Skipped if forceRegenerate=false
test("VideoGenerationOrchestrator skips already completed stage when forceRegenerate is false", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } =
    createMockRepositories();
  const providerFactory = new VideoProviderFactory();
  const calcProgress = new CalculateVideoProjectProgressUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
  });

  const orchestrator = new VideoGenerationOrchestrator({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: providerFactory,
    calculateVideoProjectProgressUseCase: calcProgress,
  });

  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Idempotency Test",
  });
  const scene = await mockSceneRepo.create({
    organizationId: "org-1",
    videoProjectId: project.id,
    sceneNumber: 1,
    status: AI_VIDEO_SCENE_STATUS.IMAGE_READY,
    referenceImageUrl: "https://placeholder.shaivik.ai/existing-img.png",
  });

  // Re-run IMAGE stage with forceRegenerate = false
  const res = await orchestrator.executeStage({
    organizationId: "org-1",
    projectId: project.id,
    sceneId: scene.id,
    stage: "IMAGE",
    forceRegenerate: false,
  });

  assert.equal(res.reused, true);
  assert.equal(res.assetUrl, "https://placeholder.shaivik.ai/existing-img.png");
});

// 5. Failure Isolation Across Scenes
test("Failure in Scene 2 does not affect Scene 1 completed status", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } =
    createMockRepositories();

  // Custom ProviderFactory that fails on Scene 2 VIDEO generation
  const mockFailingVideoProvider = {
    name: "failing_video",
    async generateVideo() {
      throw new Error("Provider API connection refused");
    },
  };

  const customFactory = {
    getImageProvider: () =>
      new VideoProviderFactory().getImageProvider("placeholder"),
    getVideoProvider: () => mockFailingVideoProvider,
    getTTSProvider: () => new VideoProviderFactory().getTTSProvider("default"),
    getLipSyncProvider: () =>
      new VideoProviderFactory().getLipSyncProvider("placeholder"),
    getSubtitleProvider: () =>
      new VideoProviderFactory().getSubtitleProvider("placeholder"),
    getRenderer: () => new VideoProviderFactory().getRenderer("placeholder"),
  };

  const calcProgress = new CalculateVideoProjectProgressUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
  });

  const orchestrator = new VideoGenerationOrchestrator({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: customFactory,
    calculateVideoProjectProgressUseCase: calcProgress,
  });

  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Isolation Test",
  });
  const scene1 = await mockSceneRepo.create({
    organizationId: "org-1",
    videoProjectId: project.id,
    sceneNumber: 1,
    status: AI_VIDEO_SCENE_STATUS.COMPLETED,
  });

  const scene2 = await mockSceneRepo.create({
    organizationId: "org-1",
    videoProjectId: project.id,
    sceneNumber: 2,
    status: AI_VIDEO_SCENE_STATUS.IMAGE_READY,
    visualPrompt: "Failing scene",
  });

  // Attempt VIDEO stage on Scene 2
  const result = await orchestrator.executeStage({
    organizationId: "org-1",
    projectId: project.id,
    sceneId: scene2.id,
    stage: "VIDEO",
  });

  assert.equal(result.status, "FAILED");

  // Scene 2 should be in FAILED status
  const scene2After = await mockSceneRepo.findById(scene2.id);
  assert.equal(scene2After.status, AI_VIDEO_SCENE_STATUS.FAILED);
  assert.match(scene2After.errorMessage, /Provider API connection refused/);

  // Scene 1 MUST remain intact as COMPLETED
  const scene1After = await mockSceneRepo.findById(scene1.id);
  assert.equal(scene1After.status, AI_VIDEO_SCENE_STATUS.COMPLETED);
});

// 6. Use Cases integration
test("GenerateVideoSceneStageUseCase & RetryVideoSceneStageUseCase invoke orchestrator correctly", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } =
    createMockRepositories();
  const providerFactory = new VideoProviderFactory();
  const calcProgress = new CalculateVideoProjectProgressUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
  });

  const orchestrator = new VideoGenerationOrchestrator({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: providerFactory,
    calculateVideoProjectProgressUseCase: calcProgress,
  });

  const generateStageUseCase = new GenerateVideoSceneStageUseCase({
    videoGenerationOrchestrator: orchestrator,
  });
  const retryStageUseCase = new RetryVideoSceneStageUseCase({
    videoGenerationOrchestrator: orchestrator,
  });

  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Use Case Test",
  });
  const scene = await mockSceneRepo.create({
    organizationId: "org-1",
    videoProjectId: project.id,
    sceneNumber: 1,
  });

  const genResult = await generateStageUseCase.execute({
    organizationId: "org-1",
    projectId: project.id,
    sceneId: scene.id,
    stage: "IMAGE",
    options: { providerName: "placeholder" },
  });
  assert.equal(genResult.scene.status, AI_VIDEO_SCENE_STATUS.IMAGE_READY);

  const retryResult = await retryStageUseCase.execute({
    organizationId: "org-1",
    projectId: project.id,
    sceneId: scene.id,
    stage: "IMAGE",
    forceRegenerate: true,
    options: { providerName: "placeholder" },
  });
  assert.equal(retryResult.scene.status, AI_VIDEO_SCENE_STATUS.IMAGE_READY);
});
