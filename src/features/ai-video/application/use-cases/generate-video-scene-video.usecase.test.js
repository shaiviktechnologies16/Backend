import test from "node:test";
import assert from "node:assert/strict";

import { LocalVideoProvider } from "../../infrastructure/providers/local-video.provider.js";
import { PlaceholderVideoProvider } from "../../infrastructure/providers/placeholder-video.provider.js";
import { VideoProviderFactory } from "../services/video-provider.factory.js";
import { GenerateVideoSceneVideoUseCase } from "./generate-video-scene-video.usecase.js";
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
      const id = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
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

test("AI Video Architecture — Local CogVideoX Animated Scene Video Pipeline (14 Core Tests)", async (t) => {
  // Test 1: Local video provider resolution
  await t.test("1. Local video provider resolution", async () => {
    const factory = new VideoProviderFactory({
      localVideoProvider: new LocalVideoProvider({
        baseUrl: "http://127.0.0.1:8002",
        model: "cogvideo-x",
      }),
    });

    const provider = factory.getVideoProvider("local");
    assert.ok(provider, "Provider must be resolved");
    assert.equal(provider.name, "local-video-provider");
    assert.equal(provider.model, "cogvideo-x");

    const defaultProvider = factory.getVideoProvider();
    assert.equal(defaultProvider.name, "local-video-provider");
  });

  // Test 2: CogVideoX request construction
  await t.test("2. CogVideoX request construction", async () => {
    let capturedUrl = null;
    let capturedBody = null;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          job_id: "cog-req-job-1",
          status: "GENERATING",
        }),
      };
    };

    try {
      const provider = new LocalVideoProvider({
        baseUrl: "http://127.0.0.1:8002",
        model: "cogvideo-x",
      });

      await provider.generateVideo({
        prompt: "A developer in blue hoodie coding on laptop",
        negativePrompt: "low quality, blurry, distorted",
        motionPrompt: "Camera slowly pans left around desk",
        duration: 5,
        aspectRatio: "9:16",
        fps: 24,
        seed: 42,
        referenceImageUrl: "http://storage.shaivik.ai/avatars/dev-stored.png",
      });

      assert.equal(capturedUrl, "http://127.0.0.1:8002/generate");
      assert.equal(capturedBody.model, "cogvideo-x");
      assert.equal(capturedBody.prompt, "A developer in blue hoodie coding on laptop");
      assert.equal(capturedBody.negative_prompt, "low quality, blurry, distorted");
      assert.equal(capturedBody.motion_prompt, "Camera slowly pans left around desk");
      assert.equal(capturedBody.duration, 5);
      assert.equal(capturedBody.aspect_ratio, "9:16");
      assert.equal(capturedBody.width, 720);
      assert.equal(capturedBody.height, 1280);
      assert.equal(capturedBody.fps, 24);
      assert.equal(capturedBody.seed, 42);
      assert.equal(capturedBody.reference_image_url, "http://storage.shaivik.ai/avatars/dev-stored.png");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 3: Successful video generation
  await t.test("3. Successful video generation", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        job_id: "cog-job-success",
        status: "READY",
        video_url: "http://127.0.0.1:8002/videos/output-clip.mp4",
        local_path: "/data/videos/output-clip.mp4",
      }),
    });

    try {
      const provider = new LocalVideoProvider({
        baseUrl: "http://127.0.0.1:8002",
        model: "cogvideo-x",
      });

      const res = await provider.generateVideo({
        prompt: "Futuristic robot barista making coffee",
        aspectRatio: "16:9",
        duration: 4,
      });

      assert.equal(res.status, "READY");
      assert.equal(res.jobId, "cog-job-success");
      assert.equal(res.videoUrl, "http://127.0.0.1:8002/videos/output-clip.mp4");
      assert.equal(res.localPath, "/data/videos/output-clip.mp4");
      assert.equal(res.width, 1280);
      assert.equal(res.height, 720);
      assert.equal(res.duration, 4);
      assert.equal(res.provider, "local-video-provider");
      assert.equal(res.model, "cogvideo-x");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 4: Local provider timeout
  await t.test("4. Local provider timeout", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      const err = new Error("The operation was aborted due to timeout");
      err.name = "TimeoutError";
      throw err;
    };

    try {
      const provider = new LocalVideoProvider({
        baseUrl: "http://127.0.0.1:8002",
        timeoutMs: 100,
        maxRetries: 0,
      });

      await assert.rejects(
        async () => {
          await provider.generateVideo({ prompt: "Timeout test" });
        },
        (err) => {
          assert(err instanceof AppError);
          assert.equal(err.errorCode, "AI_VIDEO_GENERATION_TIMEOUT");
          assert.equal(err.statusCode, 408);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 5: Local provider connection failure
  await t.test("5. Local provider connection failure", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      const err = new Error("connect ECONNREFUSED 127.0.0.1:8002");
      err.code = "ECONNREFUSED";
      throw err;
    };

    try {
      const provider = new LocalVideoProvider({
        baseUrl: "http://127.0.0.1:8002",
        maxRetries: 0,
      });

      await assert.rejects(
        async () => {
          await provider.generateVideo({ prompt: "Connection refused test" });
        },
        (err) => {
          assert(err instanceof AppError);
          assert.equal(err.errorCode, "AI_VIDEO_PROVIDER_UNAVAILABLE");
          assert.equal(err.statusCode, 503);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 6: Provider 5xx retry
  await t.test("6. Provider 5xx retry", async () => {
    let attemptCount = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      attemptCount++;
      if (attemptCount === 1) {
        return {
          ok: false,
          status: 503,
          text: async () => "GPU model reloading",
        };
      }
      return {
        ok: true,
        json: async () => ({
          job_id: "retry-job-ok",
          status: "READY",
          video_url: "http://127.0.0.1:8002/videos/retry-clip.mp4",
        }),
      };
    };

    try {
      const provider = new LocalVideoProvider({
        baseUrl: "http://127.0.0.1:8002",
        maxRetries: 2,
        baseRetryDelayMs: 10,
      });

      const res = await provider.generateVideo({ prompt: "Testing 5xx retry" });
      assert.equal(attemptCount, 2, "Must retry transient 5xx error");
      assert.equal(res.status, "READY");
      assert.equal(res.videoUrl, "http://127.0.0.1:8002/videos/retry-clip.mp4");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 7: Invalid provider response
  await t.test("7. Invalid provider response", async () => {
    let attemptCount = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      attemptCount++;
      return {
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON at position 0");
        },
      };
    };

    try {
      const provider = new LocalVideoProvider({
        baseUrl: "http://127.0.0.1:8002",
        maxRetries: 2,
        baseRetryDelayMs: 10,
      });

      await assert.rejects(
        async () => {
          await provider.generateVideo({ prompt: "Testing malformed JSON" });
        },
        (err) => {
          assert(err instanceof AppError);
          assert.equal(err.errorCode, "AI_VIDEO_PROVIDER_INVALID_RESPONSE");
          assert.equal(err.statusCode, 502);
          return true;
        }
      );

      // Should not endlessly retry malformed non-transient JSON responses
      assert.equal(attemptCount, 1, "Must not retry fatal invalid JSON");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 8: Scene -> video generation
  await t.test("8. Scene → video generation", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo } = createMockRepos();

    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      title: "Telugu AI Explainer",
      style: "3d-cartoon",
      aspectRatio: "9:16",
    });

    const scene = await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      duration: 5,
      visualPrompt: "Developer frustrated looking at bugs on screen",
      motionPrompt: "Quick zoom to screen showing red error text",
      status: "PENDING",
    });

    let capturedPayload = null;
    const mockVideoProvider = {
      name: "local-video-provider",
      model: "cogvideo-x",
      async generateVideo(payload) {
        capturedPayload = payload;
        return {
          status: "READY",
          videoUrl: "http://127.0.0.1:8002/videos/scene-1.mp4",
        };
      },
      async getGenerationStatus() {
        return { status: "READY", videoUrl: "http://127.0.0.1:8002/videos/scene-1.mp4" };
      },
    };

    const useCase = new GenerateVideoSceneVideoUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoProviderFactory: { getVideoProvider: () => mockVideoProvider },
    });

    const res = await useCase.execute({
      organizationId: "org-1",
      projectId: project.id,
      sceneNumber: 1,
      sync: true,
    });

    assert.equal(res.success, true);
    assert.equal(res.status, "READY");
    assert.equal(res.videoUrl, "http://127.0.0.1:8002/videos/scene-1.mp4");
    assert.ok(capturedPayload.prompt.includes("Developer frustrated"));
    assert.equal(capturedPayload.motionPrompt, "Quick zoom to screen showing red error text");
  });

  // Test 9: Character reference forwarding when supported
  await t.test("9. Character reference forwarding when supported", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo } = createMockRepos();

    const char = await mockCharRepo.create({
      organizationId: "org-1",
      name: "Chitti Robot",
      referenceImageUrl: "http://storage.shaivik.ai/avatars/chitti-stored.png",
    });

    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      title: "Chitti Robot Video",
      style: "3d-cartoon",
    });

    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      duration: 5,
      visualPrompt: "Chitti Robot waving excitedly",
      characterIds: [char.id],
      status: "PENDING",
    });

    let receivedReferenceImage = null;
    const mockVideoProvider = {
      name: "local-video-provider",
      model: "cogvideo-x",
      async generateVideo(payload) {
        receivedReferenceImage = payload.referenceImageUrl;
        return {
          status: "READY",
          videoUrl: "http://127.0.0.1:8002/videos/chitti-1.mp4",
        };
      },
    };

    const useCase = new GenerateVideoSceneVideoUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoProviderFactory: { getVideoProvider: () => mockVideoProvider },
    });

    await useCase.execute({
      organizationId: "org-1",
      projectId: project.id,
      sceneNumber: 1,
      sync: true,
    });

    assert.equal(receivedReferenceImage, "http://storage.shaivik.ai/avatars/chitti-stored.png");
  });

  // Test 10: Video generation without a reference image
  await t.test("10. Video generation without a reference image", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo } = createMockRepos();

    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      title: "No Character Reference",
    });

    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      duration: 5,
      visualPrompt: "Sunset over futuristic city skyline",
      characterIds: [],
      status: "PENDING",
    });

    let receivedReferenceImage = "not-called";
    const mockVideoProvider = {
      name: "local-video-provider",
      model: "cogvideo-x",
      async generateVideo(payload) {
        receivedReferenceImage = payload.referenceImageUrl;
        return {
          status: "READY",
          videoUrl: "http://127.0.0.1:8002/videos/skyline.mp4",
        };
      },
    };

    const useCase = new GenerateVideoSceneVideoUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoProviderFactory: { getVideoProvider: () => mockVideoProvider },
    });

    const res = await useCase.execute({
      organizationId: "org-1",
      projectId: project.id,
      sceneNumber: 1,
      sync: true,
    });

    assert.equal(res.success, true);
    assert.equal(receivedReferenceImage, null, "Must be null when no character reference exists");
  });

  // Test 11: Existing successful video preserved after failed regeneration
  await t.test("11. Existing successful video preserved after failed regeneration", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo } = createMockRepos();

    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      title: "Preserve Video Test",
    });

    const scene = await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      videoUrl: "http://storage.shaivik.ai/existing-v1-video.mp4",
      status: "READY",
    });

    const mockVideoProvider = {
      name: "local-video-provider",
      model: "cogvideo-x",
      async generateVideo() {
        throw new Error("CUDA OOM: out of memory allocating 8GB");
      },
    };

    const useCase = new GenerateVideoSceneVideoUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoProviderFactory: { getVideoProvider: () => mockVideoProvider },
    });

    await assert.rejects(
      async () => {
        await useCase.execute({
          organizationId: "org-1",
          projectId: project.id,
          sceneNumber: 1,
          forceRegenerate: true,
          sync: true,
        });
      },
      (err) => err.message.includes("CUDA OOM")
    );

    const persistedScene = await mockSceneRepo.findById(scene.id);
    assert.equal(persistedScene.status, "FAILED");
    assert.equal(
      persistedScene.videoUrl,
      "http://storage.shaivik.ai/existing-v1-video.mp4",
      "Existing videoUrl must be preserved upon failed regeneration"
    );
  });

  // Test 12: No OpenAI image provider called during normal video generation
  await t.test("12. No OpenAI image provider called during normal video generation", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo } = createMockRepos();

    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      title: "No OpenAI Regression Test",
    });

    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      visualPrompt: "Developer coding",
      status: "PENDING",
    });

    let openAiImageApiCalled = false;
    let responseFormatFound = false;

    const forbiddenOpenAI = {
      images: {
        generate: async (payload) => {
          openAiImageApiCalled = true;
          if (payload?.response_format) responseFormatFound = true;
          return { data: [{ url: "https://openai.com/image.png" }] };
        },
      },
    };

    const mockVideoProvider = {
      name: "local-video-provider",
      model: "cogvideo-x",
      async generateVideo(payload) {
        if ("response_format" in payload) responseFormatFound = true;
        return {
          status: "READY",
          videoUrl: "http://127.0.0.1:8002/videos/clean.mp4",
        };
      },
    };

    const useCase = new GenerateVideoSceneVideoUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoProviderFactory: { getVideoProvider: () => mockVideoProvider },
      openAIClient: forbiddenOpenAI,
    });

    await useCase.execute({
      organizationId: "org-1",
      projectId: project.id,
      sceneNumber: 1,
      sync: true,
    });

    assert.equal(openAiImageApiCalled, false, "Must NOT call OpenAI image API");
    assert.equal(responseFormatFound, false, "Must NOT send response_format parameter");
  });

  // Test 13: Correct asynchronous generation status
  await t.test("13. Correct asynchronous generation status", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo } = createMockRepos();

    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      title: "Async Test",
    });

    const scene = await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      visualPrompt: "Async scene",
      status: "PENDING",
    });

    const mockVideoProvider = {
      name: "local-video-provider",
      model: "cogvideo-x",
      async generateVideo() {
        return {
          jobId: "async-job-123",
          status: "GENERATING",
        };
      },
      async getGenerationStatus() {
        return { status: "PROCESSING" };
      },
    };

    const useCase = new GenerateVideoSceneVideoUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoProviderFactory: { getVideoProvider: () => mockVideoProvider },
    });

    const res = await useCase.execute({
      organizationId: "org-1",
      projectId: project.id,
      sceneNumber: 1,
      sync: false, // Asynchronous
      options: { skipPolling: true },
    });

    assert.equal(res.success, true);
    assert.equal(res.status, "GENERATING");
    assert.ok(res.jobId);
    assert.equal(res.scene.status, "GENERATING");

    const inProgressScene = await mockSceneRepo.findById(scene.id);
    assert.equal(inProgressScene.status, "VIDEO_GENERATING");
  });

  // Test 14: Final generated video persistence
  await t.test("14. Final generated video persistence", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo } = createMockRepos();

    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      title: "Persistence Test",
      storyboard: {
        scenes: [
          { sceneNumber: 1, visualPrompt: "Scene 1", status: "PENDING" },
        ],
      },
    });

    const scene = await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      visualPrompt: "Scene 1",
      status: "PENDING",
    });

    const mockVideoProvider = {
      name: "local-video-provider",
      model: "cogvideo-x",
      async generateVideo() {
        return {
          jobId: "persist-job-777",
          status: "READY",
          videoUrl: "http://storage.shaivik.ai/videos/persisted-scene-1.mp4",
        };
      },
    };

    const useCase = new GenerateVideoSceneVideoUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoProviderFactory: { getVideoProvider: () => mockVideoProvider },
    });

    const result = await useCase.execute({
      organizationId: "org-1",
      projectId: project.id,
      sceneNumber: 1,
      sync: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.videoUrl, "http://storage.shaivik.ai/videos/persisted-scene-1.mp4");

    // Verify persisted in scene repository
    const finalScene = await mockSceneRepo.findById(scene.id);
    assert.ok(
      finalScene.status === "VIDEO_READY" || finalScene.status === "READY",
      "Scene status must be VIDEO_READY or READY"
    );
    assert.equal(finalScene.videoUrl, "http://storage.shaivik.ai/videos/persisted-scene-1.mp4");

    // Verify persisted in project storyboard
    const updatedProject = await mockProjectRepo.findByIdForOrganization(project.id, "org-1");
    assert.equal(updatedProject.storyboard.scenes[0].videoUrl, "http://storage.shaivik.ai/videos/persisted-scene-1.mp4");
    assert.equal(updatedProject.storyboard.scenes[0].status, "READY");
  });
});
