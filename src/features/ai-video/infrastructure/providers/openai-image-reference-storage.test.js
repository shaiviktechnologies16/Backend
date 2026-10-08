import test from "node:test";
import assert from "node:assert/strict";

import { OpenAiImageProvider } from "./openai-image.provider.js";
import { VideoGenerationOrchestrator } from "../../application/services/video-generation.orchestrator.js";
import { VideoProviderFactory } from "../../application/services/video-provider.factory.js";
import { AI_VIDEO_SCENE_STATUS, AI_VIDEO_PROJECT_STATUS } from "../../domain/constants/ai-video.constants.js";
import { AppError } from "../../../../common/errors/AppError.js";

// Helper to create mock repositories for testing Phase 5.1
function createMockRepositories() {
  const projects = new Map();
  const scenes = new Map();
  const characters = new Map();
  const assets = new Map();

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
    async updateStatus(id, status) {
      const existing = projects.get(id);
      if (!existing) return null;
      const updated = { ...existing, status, updatedAt: new Date() };
      projects.set(id, updated);
      return updated;
    },
  };

  const mockSceneRepo = {
    async create(data) {
      const id = `scene-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const entity = { id, status: AI_VIDEO_SCENE_STATUS.PENDING, ...data, createdAt: new Date(), updatedAt: new Date() };
      scenes.set(id, entity);
      return entity;
    },
    async findById(id) {
      return scenes.get(id) || null;
    },
    async updateStatus(id, status, extraPayload = {}) {
      const existing = scenes.get(id);
      if (!existing) return null;
      const updated = { ...existing, status, ...extraPayload, updatedAt: new Date() };
      scenes.set(id, updated);
      return updated;
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
  };

  const mockAssetRepo = {
    async create(data) {
      const id = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const entity = { id, ...data, createdAt: new Date() };
      assets.set(id, entity);
      return entity;
    },
    async findBySceneId(sceneId) {
      return Array.from(assets.values()).filter((a) => a.sceneId === sceneId || a.videoSceneId === sceneId);
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

// Test 1: Reference image passed to provider
test("Test 1: Reference image passed to OpenAiImageProvider invokes reference fetch and visual input flow", async () => {
  let referenceImageFetched = false;
  let editCalled = false;

  const mockStorageProvider = {
    async upload({ buffer, purpose, organizationId, projectId }) {
      return {
        provider: "CLOUDINARY",
        key: "shaivik-ai/scene-1.png",
        url: "https://storage.shaivik.ai/permanent/scene-1.png",
      };
    },
  };

  const provider = new OpenAiImageProvider({
    storageProvider: mockStorageProvider,
  });

  // Mock getClient to return a mock OpenAI client
  provider.getClient = async () => ({
    images: {
      edit: async ({ image, prompt }) => {
        editCalled = true;
        return { data: [{ url: "https://oaidalleapiprodscus.blob.core.windows.net/temp-edit.png" }] };
      },
      generate: async () => {
        return { data: [{ url: "https://oaidalleapiprodscus.blob.core.windows.net/temp-gen.png" }] };
      },
    },
  });

  // Mock fetchReferenceImageBuffer to avoid real network call
  provider.fetchReferenceImageBuffer = async (url) => {
    referenceImageFetched = true;
    return Buffer.from("fake-png-data");
  };

  // Mock global fetch for temp image download during permanent storage upload
  globalThis.fetch = async (url) => ({
    ok: true,
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  });

  const res = await provider.generateImage({
    prompt: "Arjun in ancient library",
    referenceImageUrl: "https://images.shaivik.ai/arjun-ref.png",
    aspectRatio: "9:16",
    organizationId: "org-100",
    projectId: "proj-100",
  });

  assert.equal(referenceImageFetched, true);
  assert.equal(editCalled, true);
  assert.equal(res.assetUrl, "https://storage.shaivik.ai/permanent/scene-1.png");
});

// Test 2: Multiple character references handled
test("Test 2: Multiple character references attached to scene are passed to provider", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();

  const char1 = await mockCharRepo.create({ organizationId: "org-1", name: "Arjun", referenceImageUrl: "https://img.com/arjun.png" });
  const char2 = await mockCharRepo.create({ organizationId: "org-1", name: "Karna", referenceImageUrl: "https://img.com/karna.png" });

  const project = await mockProjectRepo.create({ organizationId: "org-1", name: "Epic Battle" });
  const scene = await mockSceneRepo.create({
    organizationId: "org-1",
    videoProjectId: project.id,
    characterIds: [char1.id, char2.id],
    visualPrompt: "Arjun and Karna duel",
  });

  let capturedCharacters = null;
  const mockImageProvider = {
    name: "openai-image-provider",
    async generateImage({ characters, referenceImageUrl }) {
      capturedCharacters = characters;
      return {
        provider: "openai-image-provider",
        status: "COMPLETED",
        assetUrl: "https://storage.shaivik.ai/permanent/scene-multi-char.png",
        metadata: {},
      };
    },
  };

  const mockFactory = {
    getImageProvider: () => mockImageProvider,
  };

  const orchestrator = new VideoGenerationOrchestrator({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: mockFactory,
  });

  const res = await orchestrator.executeStage({
    organizationId: "org-1",
    projectId: project.id,
    sceneId: scene.id,
    stage: "IMAGE",
    forceRegenerate: true,
  });

  assert.equal(res.status, "COMPLETED");
  assert.equal(capturedCharacters.length, 2);
  assert.equal(capturedCharacters[0].name, "Arjun");
  assert.equal(capturedCharacters[1].name, "Karna");
});

// Test 3: Invalid/missing reference error (REFERENCE_IMAGE_UNAVAILABLE)
test("Test 3: SSRF blocked or invalid reference image throws REFERENCE_IMAGE_UNAVAILABLE", async () => {
  const provider = new OpenAiImageProvider();

  // Test SSRF block on localhost
  assert.throws(
    () => provider.validateUrlForSsrf("http://127.0.0.1:8080/internal-secret.png"),
    (err) => err instanceof AppError && err.errorCode === "REFERENCE_IMAGE_UNAVAILABLE" && err.statusCode === 403,
  );

  // Test SSRF block on private IP 10.x
  assert.throws(
    () => provider.validateUrlForSsrf("http://10.0.0.1/admin.jpg"),
    (err) => err instanceof AppError && err.errorCode === "REFERENCE_IMAGE_UNAVAILABLE",
  );
});

// Test 4 & 5: Permanent storage URL set in video_assets.url & scene.referenceImageUrl (temporary URL never persisted)
test("Test 4 & 5: Permanent storage URL set in video_assets.url & scene.referenceImageUrl, temporary OpenAI URL is never saved", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();

  const project = await mockProjectRepo.create({ organizationId: "org-1", name: "Storage Test" });
  const scene = await mockSceneRepo.create({ organizationId: "org-1", videoProjectId: project.id, visualPrompt: "Sunset" });

  const mockStorageProvider = {
    async upload() {
      return {
        provider: "CLOUDINARY",
        key: "shaivik/sunset.png",
        url: "https://storage.shaivik.ai/permanent/sunset-stored.png",
      };
    },
  };

  const openAiProvider = new OpenAiImageProvider({ storageProvider: mockStorageProvider });
  openAiProvider.getClient = async () => ({
    images: {
      generate: async () => ({
        data: [{ url: "https://oaidalleapiprodscus.blob.core.windows.net/temp-dalle-url.png" }],
      }),
    },
  });

  globalThis.fetch = async () => ({
    ok: true,
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  });

  const mockFactory = {
    getImageProvider: () => openAiProvider,
  };

  const orchestrator = new VideoGenerationOrchestrator({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: mockFactory,
  });

  const res = await orchestrator.executeStage({
    organizationId: "org-1",
    projectId: project.id,
    sceneId: scene.id,
    stage: "IMAGE",
    forceRegenerate: true,
  });

  assert.equal(res.assetUrl, "https://storage.shaivik.ai/permanent/sunset-stored.png");

  const updatedScene = await mockSceneRepo.findById(scene.id);
  assert.equal(updatedScene.referenceImageUrl, "https://storage.shaivik.ai/permanent/sunset-stored.png");
  assert.equal(updatedScene.referenceImageUrl.includes("blob.core.windows.net"), false);

  const assets = await mockAssetRepo.findBySceneId(scene.id);
  assert.equal(assets.length, 1);
  assert.equal(assets[0].url, "https://storage.shaivik.ai/permanent/sunset-stored.png");
  assert.equal(assets[0].url.includes("blob.core.windows.net"), false);
});

// Test 6: Storage failure sets scene status to FAILED with IMAGE_ASSET_STORAGE_FAILED and preserves previous image
test("Test 6: Storage failure sets scene status to FAILED with IMAGE_ASSET_STORAGE_FAILED and preserves previous image", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();

  const project = await mockProjectRepo.create({ organizationId: "org-1", name: "Storage Failure Test" });
  const scene = await mockSceneRepo.create({
    organizationId: "org-1",
    videoProjectId: project.id,
    visualPrompt: "Castle",
    referenceImageUrl: "https://storage.shaivik.ai/v1-working.png",
  });

  const failingStorageProvider = {
    async upload() {
      throw new Error("Cloudinary S3 bucket connection timeout");
    },
  };

  const openAiProvider = new OpenAiImageProvider({ storageProvider: failingStorageProvider });
  openAiProvider.getClient = async () => ({
    images: {
      generate: async () => ({
        data: [{ url: "https://oaidalleapiprodscus.blob.core.windows.net/temp-castle.png" }],
      }),
    },
  });

  globalThis.fetch = async () => ({
    ok: true,
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  });

  const mockFactory = {
    getImageProvider: () => openAiProvider,
  };

  const orchestrator = new VideoGenerationOrchestrator({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: mockFactory,
  });

  await assert.rejects(
    async () =>
      orchestrator.executeStage({
        organizationId: "org-1",
        projectId: project.id,
        sceneId: scene.id,
        stage: "IMAGE",
        forceRegenerate: true,
      }),
    (err) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.errorCode, "IMAGE_ASSET_STORAGE_FAILED");
      return true;
    },
  );

  const sceneAfter = await mockSceneRepo.findById(scene.id);
  assert.equal(sceneAfter.status, AI_VIDEO_SCENE_STATUS.FAILED);
  assert.equal(sceneAfter.referenceImageUrl, "https://storage.shaivik.ai/v1-working.png");
});

// Test 7: Non-destructive versioning (V1 retained, V2 active)
test("Test 7: Non-destructive versioning retains V1 asset and creates V2 active asset", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();

  const project = await mockProjectRepo.create({ organizationId: "org-1", name: "Versioning Test" });
  const scene = await mockSceneRepo.create({
    organizationId: "org-1",
    videoProjectId: project.id,
    referenceImageUrl: "https://storage.shaivik.ai/v1.png",
  });

  // Manually insert V1 asset record
  await mockAssetRepo.create({
    organizationId: "org-1",
    videoProjectId: project.id,
    sceneId: scene.id,
    type: "IMAGE",
    provider: "openai-image-provider",
    url: "https://storage.shaivik.ai/v1.png",
  });

  let counter = 2;
  const mockImageProvider = {
    name: "openai-image-provider",
    async generateImage() {
      return {
        provider: "openai-image-provider",
        status: "COMPLETED",
        assetUrl: `https://storage.shaivik.ai/v${counter++}.png`,
        metadata: {},
      };
    },
  };

  const mockFactory = { getImageProvider: () => mockImageProvider };

  const orchestrator = new VideoGenerationOrchestrator({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: mockFactory,
  });

  // Regenerate with forceRegenerate = true
  const res = await orchestrator.executeStage({
    organizationId: "org-1",
    projectId: project.id,
    sceneId: scene.id,
    stage: "IMAGE",
    forceRegenerate: true,
  });

  assert.equal(res.assetUrl, "https://storage.shaivik.ai/v2.png");

  const assets = await mockAssetRepo.findBySceneId(scene.id);
  assert.equal(assets.length, 2);
  assert.equal(assets[0].url, "https://storage.shaivik.ai/v1.png");
  assert.equal(assets[1].url, "https://storage.shaivik.ai/v2.png");

  const sceneAfter = await mockSceneRepo.findById(scene.id);
  assert.equal(sceneAfter.referenceImageUrl, "https://storage.shaivik.ai/v2.png");
});

// Test 8: Regeneration failure preserves V1
test("Test 8: Regeneration failure preserves V1 asset on scene", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();

  const project = await mockProjectRepo.create({ organizationId: "org-1", name: "Regen Failure Test" });
  const scene = await mockSceneRepo.create({
    organizationId: "org-1",
    videoProjectId: project.id,
    referenceImageUrl: "https://storage.shaivik.ai/v1-good.png",
  });

  const mockFailingProvider = {
    name: "openai-image-provider",
    async generateImage() {
      throw new AppError("DALL-E rate limit exceeded", 429, "IMAGE_GENERATION_LIMIT_EXCEEDED");
    },
  };

  const mockFactory = { getImageProvider: () => mockFailingProvider };

  const orchestrator = new VideoGenerationOrchestrator({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: mockFactory,
  });

  await assert.rejects(
    async () =>
      orchestrator.executeStage({
        organizationId: "org-1",
        projectId: project.id,
        sceneId: scene.id,
        stage: "IMAGE",
        forceRegenerate: true,
      }),
    (err) => err instanceof AppError && err.errorCode === "IMAGE_GENERATION_LIMIT_EXCEEDED",
  );

  const sceneAfter = await mockSceneRepo.findById(scene.id);
  assert.equal(sceneAfter.status, AI_VIDEO_SCENE_STATUS.FAILED);
  assert.equal(sceneAfter.referenceImageUrl, "https://storage.shaivik.ai/v1-good.png");
});

// Test 9: Idempotency (forceRegenerate = false)
test("Test 9: forceRegenerate=false reuses existing image without provider call", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();

  const project = await mockProjectRepo.create({ organizationId: "org-1", name: "Idempotency Test" });
  const scene = await mockSceneRepo.create({
    organizationId: "org-1",
    videoProjectId: project.id,
    status: AI_VIDEO_SCENE_STATUS.IMAGE_READY,
    referenceImageUrl: "https://storage.shaivik.ai/reused-img.png",
  });

  let providerCalled = false;
  const mockProvider = {
    async generateImage() {
      providerCalled = true;
    },
  };

  const orchestrator = new VideoGenerationOrchestrator({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => mockProvider },
  });

  const res = await orchestrator.executeStage({
    organizationId: "org-1",
    projectId: project.id,
    sceneId: scene.id,
    stage: "IMAGE",
    forceRegenerate: false,
  });

  assert.equal(res.status, "REUSED");
  assert.equal(res.reused, true);
  assert.equal(res.assetUrl, "https://storage.shaivik.ai/reused-img.png");
  assert.equal(providerCalled, false);
});

// Test 10: Organization isolation on character reference images
test("Test 10: Referencing character belonging to different organization throws authorization error", async () => {
  const { mockProjectRepo, mockSceneRepo, mockCharRepo, mockAssetRepo } = createMockRepositories();

  // Character belongs to Org A
  const foreignChar = await mockCharRepo.create({
    organizationId: "org-A",
    name: "Foreign Char",
    referenceImageUrl: "https://img.com/foreign.png",
  });

  // Project belongs to Org B
  const project = await mockProjectRepo.create({ organizationId: "org-B", name: "Org B Project" });
  const scene = await mockSceneRepo.create({
    organizationId: "org-B",
    videoProjectId: project.id,
    characterIds: [foreignChar.id],
  });

  const orchestrator = new VideoGenerationOrchestrator({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: { getImageProvider: () => ({ name: "mock" }) },
  });

  await assert.rejects(
    async () =>
      orchestrator.executeStage({
        organizationId: "org-B",
        projectId: project.id,
        sceneId: scene.id,
        stage: "IMAGE",
        forceRegenerate: true,
      }),
    (err) => err instanceof AppError && err.errorCode === "REFERENCE_IMAGE_UNAVAILABLE" && err.statusCode === 403,
  );
});
