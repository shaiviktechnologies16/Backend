import test from "node:test";
import assert from "node:assert/strict";

import { OpenAiImageProvider } from "../../infrastructure/providers/openai-image.provider.js";
import { PlaceholderImageProvider } from "../../infrastructure/providers/placeholder-image.provider.js";
import { GenerateVideoSceneImageUseCase } from "./generate-video-scene-image.usecase.js";
import { AppError } from "../../../../common/errors/AppError.js";

function createMockRepos() {
  const characters = new Map();
  const mockCharRepo = {
    characters,
    async create(data) {
      const id = `char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const entity = { id, ...data };
      characters.set(id, entity);
      return entity;
    },
    async findById(id) {
      return characters.get(id) || null;
    },
    async findAllByOrganization(orgId) {
      const list = Array.from(characters.values()).filter((c) => c.organizationId === orgId);
      return { characters: list, total: list.length };
    },
  };

  const projects = new Map();
  const mockProjectRepo = {
    projects,
    async create(data) {
      const id = `proj-${Date.now()}`;
      const entity = { id, ...data };
      projects.set(id, entity);
      return entity;
    },
    async findByIdForOrganization(id, orgId) {
      const p = projects.get(id);
      return p && p.organizationId === orgId ? p : null;
    },
    async update(id, data) {
      const p = projects.get(id);
      if (p) Object.assign(p, data);
      return p;
    },
  };

  const scenes = new Map();
  const mockSceneRepo = {
    scenes,
    async create(data) {
      const id = `scene-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const entity = { id, ...data };
      scenes.set(id, entity);
      return entity;
    },
    async findByProjectId(projectId) {
      return Array.from(scenes.values()).filter((s) => s.videoProjectId === projectId);
    },
    async findById(id) {
      return scenes.get(id) || null;
    },
    async updateStatus(id, status, extra = {}) {
      const s = scenes.get(id);
      if (s) {
        s.status = status;
        Object.assign(s, extra);
      }
      return s;
    },
  };

  return { mockCharRepo, mockProjectRepo, mockSceneRepo };
}

test("Scene Image Generation — Provider Payload & Response Normalization", async (t) => {
  await t.test("Test 1: Unsupported response_format is NOT sent in request to OpenAI dall-e-3 / default model", async () => {
    let capturedGeneratePayload = null;

    const mockOpenAiClient = {
      images: {
        generate: async (payload) => {
          capturedGeneratePayload = payload;
          return {
            data: [{ url: "https://oaidalleapiprodscus.blob.core.windows.net/test-img.png" }],
          };
        },
      },
    };

    const provider = new OpenAiImageProvider();
    provider.getClient = async () => mockOpenAiClient;

    const res = await provider.generateImage({
      prompt: "A modern developer coding at desk",
      aspectRatio: "9:16",
      style: "3d-cartoon",
      options: { model: "dall-e-3" },
    });

    assert.ok(capturedGeneratePayload, "Provider generate should have been called");
    assert.strictEqual(
      "response_format" in capturedGeneratePayload,
      false,
      "response_format must NOT be present in payload for dall-e-3",
    );
    assert.strictEqual(capturedGeneratePayload.model, "dall-e-3");
    assert.ok(capturedGeneratePayload.prompt.length > 0);
    assert.strictEqual(res.imageUrl, "https://oaidalleapiprodscus.blob.core.windows.net/test-img.png");
  });

  await t.test("Test 2: Image generation succeeds and use case receives valid generated image", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo } = createMockRepos();

    const project = await mockProjectRepo.create({
      organizationId: "org-test-1",
      name: "AI Reel",
      prompt: "Create an AI video about robot barista",
      aspectRatio: "9:16",
      style: "3d-cartoon",
      storyboard: { scenes: [] },
    });

    const scene = await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      duration: 5,
      visualPrompt: "Close-up of robot barista serving espresso",
      speaker: "Robot",
      status: "PENDING",
    });

    let providerCalledWith = null;
    const mockImageProvider = {
      name: "mock-provider",
      defaultModel: "mock-v1",
      capabilities: { referenceImages: true, responseFormat: false },
      async generateImage(params) {
        providerCalledWith = params;
        return {
          provider: "mock-provider",
          providerJobId: "job-123",
          status: "COMPLETED",
          assetUrl: "https://assets.shaivik.ai/images/robot-barista.png",
          imageUrl: "https://assets.shaivik.ai/images/robot-barista.png",
        };
      },
    };

    const videoProviderFactory = {
      getImageProvider: () => mockImageProvider,
    };

    const useCase = new GenerateVideoSceneImageUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoProviderFactory,
    });

    const result = await useCase.execute({
      organizationId: "org-test-1",
      projectId: project.id,
      sceneNumber: 1,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.imageUrl, "https://assets.shaivik.ai/images/robot-barista.png");
    assert.strictEqual(result.imageStatus, "READY");

    const updatedScene = await mockSceneRepo.findById(scene.id);
    assert.strictEqual(updatedScene.referenceImageUrl, "https://assets.shaivik.ai/images/robot-barista.png");
    assert.strictEqual(updatedScene.status, "READY");
  });

  await t.test("Test 3: Stored character reference is passed down into provider request", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo } = createMockRepos();

    const char = await mockCharRepo.create({
      organizationId: "org-test-1",
      name: "Barista Bot",
      referenceImageUrl: "https://storage.shaivik.ai/characters/bot-ref.png",
    });

    const project = await mockProjectRepo.create({
      organizationId: "org-test-1",
      name: "Robot Story",
      prompt: "Robot in cafe",
      aspectRatio: "9:16",
      style: "3d-cartoon",
      storyboard: { scenes: [] },
    });

    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      duration: 5,
      visualPrompt: "Barista Bot preparing a drink",
      characterIds: [char.id],
      status: "PENDING",
    });

    let receivedReferenceImages = null;
    let receivedPrimaryRefUrl = null;

    const mockImageProvider = {
      name: "mock-provider",
      defaultModel: "mock-v1",
      capabilities: { referenceImages: true, responseFormat: false },
      async generateImage(params) {
        receivedReferenceImages = params.referenceImages;
        receivedPrimaryRefUrl = params.referenceImageUrl;
        return {
          provider: "mock-provider",
          status: "COMPLETED",
          imageUrl: "https://assets.shaivik.ai/images/bot-scene-1.png",
        };
      },
    };

    const useCase = new GenerateVideoSceneImageUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoProviderFactory: { getImageProvider: () => mockImageProvider },
    });

    const res = await useCase.execute({
      organizationId: "org-test-1",
      projectId: project.id,
      sceneNumber: 1,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(receivedPrimaryRefUrl, "https://storage.shaivik.ai/characters/bot-ref.png");
    assert.ok(Array.isArray(receivedReferenceImages));
    assert.strictEqual(receivedReferenceImages.length, 1);
    assert.strictEqual(receivedReferenceImages[0].characterId, char.id);
    assert.strictEqual(receivedReferenceImages[0].url, "https://storage.shaivik.ai/characters/bot-ref.png");
  });

  await t.test("Test 4: Scene with no reference images executes normal generation successfully", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo } = createMockRepos();

    const project = await mockProjectRepo.create({
      organizationId: "org-test-1",
      name: "Nature Doc",
      aspectRatio: "16:9",
      style: "photorealistic",
      storyboard: { scenes: [] },
    });

    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      duration: 5,
      visualPrompt: "Sunrise over mountain peaks",
      status: "PENDING",
    });

    let passedRefImages = null;
    let passedPrimaryRefUrl = null;

    const mockImageProvider = {
      name: "mock-provider",
      defaultModel: "mock-v1",
      capabilities: { referenceImages: true, responseFormat: false },
      async generateImage(params) {
        passedRefImages = params.referenceImages;
        passedPrimaryRefUrl = params.referenceImageUrl;
        return {
          provider: "mock-provider",
          status: "COMPLETED",
          imageUrl: "https://assets.shaivik.ai/images/mountain.png",
        };
      },
    };

    const useCase = new GenerateVideoSceneImageUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoProviderFactory: { getImageProvider: () => mockImageProvider },
    });

    const res = await useCase.execute({
      organizationId: "org-test-1",
      projectId: project.id,
      sceneNumber: 1,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(passedPrimaryRefUrl, null);
    assert.deepStrictEqual(passedRefImages, []);
    assert.strictEqual(res.imageUrl, "https://assets.shaivik.ai/images/mountain.png");
  });

  await t.test("Test 5: Provider response normalization handles both url and b64_json shapes into standard result", async () => {
    const provider = new OpenAiImageProvider();

    // 5a: URL shape
    const mockClientUrl = {
      images: {
        generate: async () => ({
          data: [{ url: "https://storage.provider.com/scene-from-url.png", revised_prompt: "revised prompt" }],
        }),
      },
    };
    provider.getClient = async () => mockClientUrl;

    const resUrl = await provider.generateImage({
      prompt: "A scene test",
      aspectRatio: "9:16",
    });
    assert.strictEqual(resUrl.imageUrl, "https://storage.provider.com/scene-from-url.png");
    assert.strictEqual(resUrl.status, "COMPLETED");
    assert.strictEqual(resUrl.provider, "openai-image-provider");

    // 5b: b64_json shape
    const sampleBase64 = Buffer.from("fake-png-data").toString("base64");
    const mockClientB64 = {
      images: {
        generate: async () => ({
          data: [{ b64_json: sampleBase64 }],
        }),
      },
    };
    provider.getClient = async () => mockClientB64;

    const resB64 = await provider.generateImage({
      prompt: "A scene test with base64 return",
      aspectRatio: "9:16",
    });
    assert.ok(resB64.imageUrl.startsWith("data:image/png;base64,"));
    assert.strictEqual(resB64.status, "COMPLETED");
    assert.strictEqual(resB64.provider, "openai-image-provider");
  });

  await t.test("Test 6: Provider-specific parameters — unsupported parameters are not sent", async () => {
    let capturedPayload = null;

    const mockClient = {
      images: {
        generate: async (payload) => {
          capturedPayload = payload;
          return { data: [{ url: "https://example.com/ok.png" }] };
        },
      },
    };

    const provider = new OpenAiImageProvider();
    provider.getClient = async () => mockClient;

    // Call with model: 'gpt-image-1' or 'dall-e-3'
    await provider.generateImage({
      prompt: "A test prompt",
      aspectRatio: "9:16",
      options: {
        model: "gpt-image-1",
        quality: "hd", // gpt-image-1 does not support quality
        response_format: "url", // gpt-image-1 does not support response_format
      },
    });

    assert.strictEqual(capturedPayload.model, "gpt-image-1");
    assert.strictEqual("response_format" in capturedPayload, false, "gpt-image-1 must not receive response_format");
    assert.strictEqual("quality" in capturedPayload, false, "gpt-image-1 must not receive quality");

    // Call with model: 'dall-e-2'
    await provider.generateImage({
      prompt: "A dall-e-2 test prompt",
      aspectRatio: "1:1",
      options: {
        model: "dall-e-2",
        response_format: "url",
      },
    });

    assert.strictEqual(capturedPayload.model, "dall-e-2");
    assert.strictEqual(capturedPayload.response_format, "url", "dall-e-2 supports response_format");
    assert.strictEqual("quality" in capturedPayload, false, "dall-e-2 must not receive quality");
  });
});
