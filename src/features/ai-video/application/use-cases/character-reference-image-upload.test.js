import test from "node:test";
import assert from "node:assert/strict";

import { UploadCharacterReferenceImageUseCase } from "./upload-character-reference-image.usecase.js";
import { CreateVideoCharacterUseCase } from "./create-video-character.usecase.js";
import { GenerateVideoSceneImageUseCase } from "./generate-video-scene-image.usecase.js";
import { VideoCharacterController } from "../../presentation/controllers/video-character.controller.js";
import { AppError } from "../../../../common/errors/AppError.js";
import { ValidationError } from "../../../../common/errors/ValidationError.js";
import { AI_VIDEO_SCENE_STATUS } from "../../domain/constants/ai-video.constants.js";

function createMockStorageProvider() {
  const storedFiles = [];
  return {
    storedFiles,
    async upload({ buffer, originalName, mimeType, size, purpose, userId, organizationId }) {
      const stored = {
        provider: "MOCK_STORAGE",
        key: `characters/${Date.now()}-${originalName}`,
        url: `https://storage.shaivik.ai/characters/${Date.now()}-${originalName}`,
        size,
        mimeType,
        purpose,
      };
      storedFiles.push(stored);
      return stored;
    },
  };
}

function createMockUploadFileUseCase() {
  const uploadedRecords = [];
  return {
    uploadedRecords,
    async execute({ userId, organizationId, purpose, file }) {
      const record = {
        id: `upload-${Date.now()}`,
        storageUrl: `https://storage.shaivik.ai/uploads/${file.originalname}`,
        storageKey: `uploads/${file.originalname}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
      uploadedRecords.push(record);
      return record;
    },
  };
}

function createMockCharacterRepository() {
  const characters = new Map();
  return {
    characters,
    async create(data) {
      const id = `char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const entity = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      characters.set(id, entity);
      return entity;
    },
    async findById(id) {
      return characters.get(id) || null;
    },
  };
}

test("UploadCharacterReferenceImageUseCase: validation checks", async (t) => {
  const storageProvider = createMockStorageProvider();
  const useCase = new UploadCharacterReferenceImageUseCase({ storageProvider });

  await t.test("throws error when organization context is missing", async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          userId: "user-1",
          organizationId: null,
          file: {
            buffer: Buffer.from("image-data"),
            originalname: "photo.jpg",
            mimetype: "image/jpeg",
            size: 1024,
          },
        });
      },
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.errorCode, "ORGANIZATION_CONTEXT_REQUIRED");
        assert.strictEqual(err.statusCode, 400);
        return true;
      },
    );
  });

  await t.test("throws error when user context is missing", async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          userId: null,
          organizationId: "org-1",
          file: {
            buffer: Buffer.from("image-data"),
            originalname: "photo.jpg",
            mimetype: "image/jpeg",
            size: 1024,
          },
        });
      },
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.errorCode, "UNAUTHORIZED");
        assert.strictEqual(err.statusCode, 401);
        return true;
      },
    );
  });

  await t.test("throws error when file is missing", async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          userId: "user-1",
          organizationId: "org-1",
          file: null,
        });
      },
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.errorCode, "MISSING_IMAGE_FILE");
        assert.strictEqual(err.statusCode, 400);
        return true;
      },
    );
  });

  await t.test("rejects files exceeding 10 MB limit", async () => {
    const elevenMbBuffer = Buffer.alloc(11 * 1024 * 1024);
    await assert.rejects(
      async () => {
        await useCase.execute({
          userId: "user-1",
          organizationId: "org-1",
          file: {
            buffer: elevenMbBuffer,
            originalname: "large.jpg",
            mimetype: "image/jpeg",
            size: elevenMbBuffer.length,
          },
        });
      },
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.errorCode, "FILE_SIZE_LIMIT_EXCEEDED");
        assert.strictEqual(err.statusCode, 400);
        return true;
      },
    );
  });

  await t.test("rejects unsupported MIME types (GIF, SVG, PDF, MP4)", async () => {
    const invalidTypes = [
      { mimetype: "image/gif", originalname: "avatar.gif" },
      { mimetype: "image/svg+xml", originalname: "vector.svg" },
      { mimetype: "application/pdf", originalname: "doc.pdf" },
      { mimetype: "video/mp4", originalname: "clip.mp4" },
    ];

    for (const item of invalidTypes) {
      await assert.rejects(
        async () => {
          await useCase.execute({
            userId: "user-1",
            organizationId: "org-1",
            file: {
              buffer: Buffer.from("data"),
              originalname: item.originalname,
              mimetype: item.mimetype,
              size: 4,
            },
          });
        },
        (err) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.errorCode, "UNSUPPORTED_IMAGE_TYPE");
          assert.strictEqual(err.statusCode, 400);
          return true;
        },
      );
    }
  });

  await t.test("rejects dangerous double extension", async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          userId: "user-1",
          organizationId: "org-1",
          file: {
            buffer: Buffer.from("malicious"),
            originalname: "avatar.php.png",
            mimetype: "image/png",
            size: 9,
          },
        });
      },
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.errorCode, "DANGEROUS_FILE_EXTENSION_DETECTED");
        return true;
      },
    );
  });
});

test("UploadCharacterReferenceImageUseCase: successful uploads for JPG, PNG, WEBP", async (t) => {
  const uploadFileUseCase = createMockUploadFileUseCase();
  const useCase = new UploadCharacterReferenceImageUseCase({ uploadFileUseCase });

  await t.test("successfully uploads JPG image and returns permanent URL", async () => {
    const result = await useCase.execute({
      userId: "user-1",
      organizationId: "org-1",
      file: {
        buffer: Buffer.from("jpg-data"),
        originalname: "hero.jpg",
        mimetype: "image/jpeg",
        size: 8,
      },
    });

    assert.ok(result.url);
    assert.strictEqual(result.originalName, "hero.jpg");
    assert.strictEqual(result.mimeType, "image/jpeg");
    assert.strictEqual(result.size, 8);
    assert.ok(result.url.startsWith("https://storage.shaivik.ai"));
  });

  await t.test("successfully uploads PNG image and returns permanent URL", async () => {
    const result = await useCase.execute({
      userId: "user-1",
      organizationId: "org-1",
      file: {
        buffer: Buffer.from("png-data"),
        originalname: "character.png",
        mimetype: "image/png",
        size: 8,
      },
    });

    assert.ok(result.url);
    assert.strictEqual(result.originalName, "character.png");
    assert.strictEqual(result.mimeType, "image/png");
  });

  await t.test("successfully uploads WebP image and returns permanent URL", async () => {
    const result = await useCase.execute({
      userId: "user-1",
      organizationId: "org-1",
      file: {
        buffer: Buffer.from("webp-data"),
        originalname: "avatar.webp",
        mimetype: "image/webp",
        size: 9,
      },
    });

    assert.ok(result.url);
    assert.strictEqual(result.originalName, "avatar.webp");
    assert.strictEqual(result.mimeType, "image/webp");
  });

  await t.test("sanitizes path traversal in filenames", async () => {
    const result = await useCase.execute({
      userId: "user-1",
      organizationId: "org-1",
      file: {
        buffer: Buffer.from("data"),
        originalname: "../../hack.png",
        mimetype: "image/png",
        size: 4,
      },
    });

    assert.ok(result.url);
    assert.ok(!result.url.includes("../"));
  });
});

test("CreateVideoCharacterUseCase: URL vs Upload Priority Handling", async (t) => {
  const characterRepo = createMockCharacterRepository();
  const createUseCase = new CreateVideoCharacterUseCase({ videoCharacterRepository: characterRepo });

  await t.test("creates character with external reference URL only", async () => {
    const char = await createUseCase.execute({
      organizationId: "org-1",
      createdById: "user-1",
      name: "Robot Bob",
      referenceImageUrl: "https://example.com/bob.jpg",
    });

    assert.strictEqual(char.name, "Robot Bob");
    assert.strictEqual(char.referenceImageUrl, "https://example.com/bob.jpg");
    assert.strictEqual(char.metadata?.referenceImageSource, "url");
  });

  await t.test("creates character with uploaded image URL only", async () => {
    const char = await createUseCase.execute({
      organizationId: "org-1",
      createdById: "user-1",
      name: "Developer Alice",
      uploadedImageUrl: "https://storage.shaivik.ai/characters/alice.png",
    });

    assert.strictEqual(char.name, "Developer Alice");
    assert.strictEqual(char.referenceImageUrl, "https://storage.shaivik.ai/characters/alice.png");
    assert.strictEqual(char.metadata?.referenceImageSource, "upload");
  });

  await t.test("when both uploaded and external URL provided, uploaded image takes priority", async () => {
    const char = await createUseCase.execute({
      organizationId: "org-1",
      createdById: "user-1",
      name: "Super Hero",
      referenceImageUrl: "https://external.com/ignored.jpg",
      uploadedImageUrl: "https://storage.shaivik.ai/characters/priority-upload.png",
    });

    assert.strictEqual(char.name, "Super Hero");
    assert.strictEqual(char.referenceImageUrl, "https://storage.shaivik.ai/characters/priority-upload.png");
    assert.strictEqual(char.metadata?.referenceImageSource, "upload");
  });

  await t.test("creates character with no reference image", async () => {
    const char = await createUseCase.execute({
      organizationId: "org-1",
      createdById: "user-1",
      name: "Plain Character",
    });

    assert.strictEqual(char.name, "Plain Character");
    assert.strictEqual(char.referenceImageUrl, null);
  });
});

test("VideoCharacterController: uploadReferenceImage method", async () => {
  const storageProvider = createMockStorageProvider();
  const uploadUseCase = new UploadCharacterReferenceImageUseCase({ storageProvider });
  const controller = new VideoCharacterController({
    createVideoCharacterUseCase: null,
    getVideoCharacterUseCase: null,
    listVideoCharactersUseCase: null,
    uploadCharacterReferenceImageUseCase: uploadUseCase,
  });

  const req = {
    context: { organization: { id: "org-1" } },
    user: { id: "user-1" },
    file: {
      buffer: Buffer.from("character-image-content"),
      originalname: "character.png",
      mimetype: "image/png",
      size: 23,
    },
  };

  let responseStatus = null;
  let responseBody = null;

  const res = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  await controller.uploadReferenceImage(req, res);

  assert.strictEqual(responseStatus, 201);
  assert.strictEqual(responseBody.success, true);
  assert.ok(responseBody.data.url.startsWith("https://storage.shaivik.ai"));
  assert.strictEqual(responseBody.data.originalName, "character.png");
  assert.strictEqual(responseBody.data.mimeType, "image/png");
});

test("Character Reuse: character with uploaded reference image is resolved during scene image generation", async () => {
  const characters = new Map();
  const mockCharRepo = {
    characters,
    async create(data) {
      const id = `char-${Date.now()}`;
      const entity = { id, ...data, createdAt: new Date() };
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
  };

  const scenes = new Map();
  const mockSceneRepo = {
    scenes,
    async create(data) {
      const id = `scene-${Date.now()}`;
      const entity = { id, ...data };
      scenes.set(id, entity);
      return entity;
    },
    async findByProjectId(projectId) {
      return Array.from(scenes.values()).filter((s) => s.videoProjectId === projectId);
    },
    async findByProjectAndNumber(projectId, sceneNum) {
      return Array.from(scenes.values()).find(
        (s) => s.videoProjectId === projectId && s.sceneNumber === sceneNum,
      ) || null;
    },
    async updateStatus(id, status, error) {
      const s = scenes.get(id);
      if (s) {
        s.status = status;
        if (error) s.errorMessage = error;
      }
      return s;
    },
    async updateReferenceImage(id, url, status) {
      const s = scenes.get(id);
      if (s) {
        s.referenceImageUrl = url;
        s.status = status;
      }
      return s;
    },
  };

  const mockAssetRepo = {
    async create(asset) {
      return { id: `asset-${Date.now()}`, ...asset };
    },
    async findBySceneId() {
      return [];
    },
  };

  // 1. Create character "BOLT" with an uploaded reference image URL
  const createCharUseCase = new CreateVideoCharacterUseCase({ videoCharacterRepository: mockCharRepo });
  const boltCharacter = await createCharUseCase.execute({
    organizationId: "org-1",
    createdById: "user-1",
    name: "BOLT",
    description: "Friendly 3D AI robot with glowing blue eyes",
    uploadedImageUrl: "https://storage.shaivik.ai/character-reference/org-1/bolt-uuid.webp",
  });

  assert.strictEqual(boltCharacter.referenceImageUrl, "https://storage.shaivik.ai/character-reference/org-1/bolt-uuid.webp");

  // 2. Create project
  const project = await mockProjectRepo.create({
    organizationId: "org-1",
    name: "Bolt Adventures",
    prompt: "A fun adventure with robot Bolt",
    style: "3d-cartoon",
    aspectRatio: "9:16",
    storyboard: {
      scenes: [{ sceneNumber: 1, visualPrompt: "Bolt waving at the screen in a modern lab" }],
    },
  });

  // 3. Create scene referencing BOLT's character ID
  await mockSceneRepo.create({
    videoProjectId: project.id,
    sceneNumber: 1,
    visualPrompt: "Bolt waving at the screen in a modern lab",
    characterIds: [boltCharacter.id],
    status: AI_VIDEO_SCENE_STATUS.PENDING,
  });

  // 4. Mock Image Provider to capture passed options
  let providerReceivedOptions = null;
  const mockImageProvider = {
    async generateImage(opts) {
      providerReceivedOptions = opts;
      return {
        provider: "mock-ai",
        status: "COMPLETED",
        assetUrl: "https://storage.shaivik.ai/scenes/scene-1.png",
      };
    },
  };

  const generateSceneImageUseCase = new GenerateVideoSceneImageUseCase({
    videoProjectRepository: mockProjectRepo,
    videoSceneRepository: mockSceneRepo,
    videoCharacterRepository: mockCharRepo,
    videoAssetRepository: mockAssetRepo,
    videoProviderFactory: {
      getImageProvider: () => mockImageProvider,
    },
  });

  // 5. Execute scene image generation
  const res = await generateSceneImageUseCase.execute({
    organizationId: "org-1",
    projectId: project.id,
    sceneNumber: 1,
  });

  // 6. Assertions: canonical reference image was resolved and passed to provider and prompt
  assert.strictEqual(res.success, true);
  assert.ok(providerReceivedOptions);
  assert.strictEqual(
    providerReceivedOptions.referenceImageUrl,
    "https://storage.shaivik.ai/character-reference/org-1/bolt-uuid.webp",
    "Scene generation must resolve and pass character's stored referenceImageUrl to provider",
  );
  assert.ok(
    providerReceivedOptions.prompt.includes("BOLT"),
    "Constructed prompt must feature character BOLT",
  );
  assert.ok(
    providerReceivedOptions.prompt.includes("benchmark for subject identity"),
    "Constructed prompt must incorporate character reference guidance",
  );
});

test("Phase 2 — Character Reference Image Consumption in Scene Image Generation: 10 Core Requirements", async (t) => {
  function setupTestEnvironment() {
    const characters = new Map();
    const mockCharRepo = {
      characters,
      async create(data) {
        const id = `char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const entity = { id, ...data, createdAt: new Date() };
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
      async findByProjectAndNumber(projectId, sceneNum) {
        return (
          Array.from(scenes.values()).find(
            (s) => s.videoProjectId === projectId && s.sceneNumber === sceneNum,
          ) || null
        );
      },
      async updateStatus(id, status, error) {
        const s = scenes.get(id);
        if (s) {
          s.status = status;
          if (error) s.errorMessage = error;
        }
        return s;
      },
      async updateReferenceImage(id, url, status) {
        const s = scenes.get(id);
        if (s) {
          s.referenceImageUrl = url;
          s.status = status;
        }
        return s;
      },
    };

    const mockAssetRepo = {
      async create(asset) {
        return { id: `asset-${Date.now()}`, ...asset };
      },
      async findBySceneId() {
        return [];
      },
    };

    let lastProviderOptions = null;
    const mockProvider = {
      async generateImage(opts) {
        lastProviderOptions = opts;
        return {
          provider: "mock",
          status: "COMPLETED",
          assetUrl: `https://storage.shaivik.ai/generated/${Date.now()}.png`,
        };
      },
    };

    const useCase = new GenerateVideoSceneImageUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoAssetRepository: mockAssetRepo,
      videoProviderFactory: {
        getImageProvider: () => mockProvider,
      },
    });

    return {
      mockCharRepo,
      mockProjectRepo,
      mockSceneRepo,
      useCase,
      getLastOptions: () => lastProviderOptions,
    };
  }

  // 1. Scene without characters
  await t.test("1. Scene without characters generates image normally with empty referenceImages", async () => {
    const { mockProjectRepo, mockSceneRepo, useCase, getLastOptions } = setupTestEnvironment();
    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      name: "Nature Doc",
      storyboard: { scenes: [{ sceneNumber: 1, visualPrompt: "A scenic waterfall" }] },
    });
    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      visualPrompt: "A scenic waterfall",
      characterIds: [],
      status: AI_VIDEO_SCENE_STATUS.PENDING,
    });

    const res = await useCase.execute({ organizationId: "org-1", projectId: project.id, sceneNumber: 1 });
    assert.strictEqual(res.success, true);
    const opts = getLastOptions();
    assert.strictEqual(opts.characters.length, 0);
    assert.strictEqual(opts.referenceImages.length, 0);
    assert.strictEqual(opts.referenceImageUrl, null);
  });

  // 2. Scene with character but no reference image
  await t.test("2. Scene with character but no reference image generates normally using character description", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo, useCase, getLastOptions } = setupTestEnvironment();
    const char = await mockCharRepo.create({
      organizationId: "org-1",
      name: "Mysterious Wizard",
      description: "Old man with grey beard and blue robes",
      referenceImageUrl: null,
    });
    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      name: "Fantasy Story",
      storyboard: { scenes: [{ sceneNumber: 1, visualPrompt: "Wizard casts a spell" }] },
    });
    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      visualPrompt: "Wizard casts a spell",
      characterIds: [char.id],
      status: AI_VIDEO_SCENE_STATUS.PENDING,
    });

    const res = await useCase.execute({ organizationId: "org-1", projectId: project.id, sceneNumber: 1 });
    assert.strictEqual(res.success, true);
    const opts = getLastOptions();
    assert.strictEqual(opts.characters.length, 1);
    assert.strictEqual(opts.referenceImages.length, 0);
    assert.ok(opts.prompt.includes("Mysterious Wizard"));
    assert.ok(opts.prompt.includes("Old man with grey beard"));
  });

  // 3. Scene with external reference URL
  await t.test("3. Scene with external reference URL resolves and passes referenceImages", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo, useCase, getLastOptions } = setupTestEnvironment();
    const char = await mockCharRepo.create({
      organizationId: "org-1",
      name: "Hero Alex",
      referenceImageUrl: "https://external.domain.com/alex.jpg",
    });
    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      name: "Hero Quest",
      storyboard: { scenes: [{ sceneNumber: 1, visualPrompt: "Alex walking down the street" }] },
    });
    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      visualPrompt: "Alex walking down the street",
      characterIds: [char.id],
      status: AI_VIDEO_SCENE_STATUS.PENDING,
    });

    const res = await useCase.execute({ organizationId: "org-1", projectId: project.id, sceneNumber: 1 });
    assert.strictEqual(res.success, true);
    const opts = getLastOptions();
    assert.strictEqual(opts.referenceImages.length, 1);
    assert.strictEqual(opts.referenceImages[0].url, "https://external.domain.com/alex.jpg");
    assert.strictEqual(opts.referenceImages[0].characterName, "Hero Alex");
  });

  // 4. Scene with uploaded/stored reference image
  await t.test("4. Scene with uploaded/stored reference image passes stored URL", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo, useCase, getLastOptions } = setupTestEnvironment();
    const char = await mockCharRepo.create({
      organizationId: "org-1",
      name: "Nova Robot",
      referenceImageUrl: "https://storage.shaivik.ai/character-reference/org-1/nova.webp",
    });
    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      name: "Sci-Fi",
      storyboard: { scenes: [{ sceneNumber: 1, visualPrompt: "Nova floating in space" }] },
    });
    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      visualPrompt: "Nova floating in space",
      characterIds: [char.id],
      status: AI_VIDEO_SCENE_STATUS.PENDING,
    });

    const res = await useCase.execute({ organizationId: "org-1", projectId: project.id, sceneNumber: 1 });
    assert.strictEqual(res.success, true);
    const opts = getLastOptions();
    assert.strictEqual(opts.referenceImages.length, 1);
    assert.strictEqual(opts.referenceImages[0].url, "https://storage.shaivik.ai/character-reference/org-1/nova.webp");
  });

  // 5. Uploaded reference takes priority
  await t.test("5. Uploaded reference takes priority when both upload and URL are supplied", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo, useCase, getLastOptions } = setupTestEnvironment();
    const createCharUseCase = new CreateVideoCharacterUseCase({ videoCharacterRepository: mockCharRepo });
    const char = await createCharUseCase.execute({
      organizationId: "org-1",
      createdById: "user-1",
      name: "Priority Hero",
      referenceImageUrl: "https://external.com/ignored.png",
      uploadedImageUrl: "https://storage.shaivik.ai/character-reference/org-1/uploaded-winner.webp",
    });
    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      name: "Priority Test",
      storyboard: { scenes: [{ sceneNumber: 1, visualPrompt: "Hero in battle" }] },
    });
    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      visualPrompt: "Hero in battle",
      characterIds: [char.id],
      status: AI_VIDEO_SCENE_STATUS.PENDING,
    });

    const res = await useCase.execute({ organizationId: "org-1", projectId: project.id, sceneNumber: 1 });
    assert.strictEqual(res.success, true);
    const opts = getLastOptions();
    assert.strictEqual(opts.referenceImages[0].url, "https://storage.shaivik.ai/character-reference/org-1/uploaded-winner.webp");
  });

  // 6. Multiple characters with multiple reference images
  await t.test("6. Multiple characters with reference images pass all references to provider", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo, useCase, getLastOptions } = setupTestEnvironment();
    const char1 = await mockCharRepo.create({
      organizationId: "org-1",
      name: "Developer",
      referenceImageUrl: "https://storage.shaivik.ai/character-reference/org-1/dev.webp",
    });
    const char2 = await mockCharRepo.create({
      organizationId: "org-1",
      name: "BOLT",
      referenceImageUrl: "https://storage.shaivik.ai/character-reference/org-1/bolt.webp",
    });
    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      name: "Dev & Robot",
      storyboard: { scenes: [{ sceneNumber: 1, visualPrompt: "Developer talks to BOLT at desk" }] },
    });
    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      visualPrompt: "Developer talks to BOLT at desk",
      characterIds: [char1.id, char2.id],
      status: AI_VIDEO_SCENE_STATUS.PENDING,
    });

    const res = await useCase.execute({ organizationId: "org-1", projectId: project.id, sceneNumber: 1 });
    assert.strictEqual(res.success, true);
    const opts = getLastOptions();
    assert.strictEqual(opts.referenceImages.length, 2);
    assert.strictEqual(opts.referenceImages[0].characterName, "Developer");
    assert.strictEqual(opts.referenceImages[0].url, "https://storage.shaivik.ai/character-reference/org-1/dev.webp");
    assert.strictEqual(opts.referenceImages[1].characterName, "BOLT");
    assert.strictEqual(opts.referenceImages[1].url, "https://storage.shaivik.ai/character-reference/org-1/bolt.webp");
    assert.ok(opts.prompt.includes("Multiple character reference images are provided"));
  });

  // 7. Same character reference reused across multiple scenes
  await t.test("7. Same character reference is consistently reused across Scene 1 and Scene 2", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo, useCase, getLastOptions } = setupTestEnvironment();
    const bolt = await mockCharRepo.create({
      organizationId: "org-1",
      name: "BOLT",
      referenceImageUrl: "https://storage.shaivik.ai/character-reference/org-1/canonical-bolt.webp",
    });
    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      name: "Bolt Series",
      storyboard: {
        scenes: [
          { sceneNumber: 1, visualPrompt: "Bolt in Scene 1" },
          { sceneNumber: 2, visualPrompt: "Bolt in Scene 2" },
        ],
      },
    });
    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      visualPrompt: "Bolt in Scene 1",
      characterIds: [bolt.id],
      status: AI_VIDEO_SCENE_STATUS.PENDING,
    });
    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 2,
      visualPrompt: "Bolt in Scene 2",
      characterIds: [bolt.id],
      status: AI_VIDEO_SCENE_STATUS.PENDING,
    });

    await useCase.execute({ organizationId: "org-1", projectId: project.id, sceneNumber: 1 });
    const optsScene1 = getLastOptions();

    await useCase.execute({ organizationId: "org-1", projectId: project.id, sceneNumber: 2 });
    const optsScene2 = getLastOptions();

    assert.strictEqual(
      optsScene1.referenceImages[0].url,
      optsScene2.referenceImages[0].url,
      "Both scenes must reuse the exact same canonical reference image URL",
    );
    assert.strictEqual(optsScene1.referenceImages[0].url, "https://storage.shaivik.ai/character-reference/org-1/canonical-bolt.webp");
  });

  // 8. Provider without reference-image support gracefully falls back
  await t.test("8. Provider without reference-image support gracefully falls back and succeeds", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo } = setupTestEnvironment();
    const char = await mockCharRepo.create({
      organizationId: "org-1",
      name: "Robot",
      referenceImageUrl: "https://storage.shaivik.ai/robot.webp",
    });
    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      name: "Fallback Test",
      storyboard: { scenes: [{ sceneNumber: 1, visualPrompt: "Robot walking" }] },
    });
    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      visualPrompt: "Robot walking",
      characterIds: [char.id],
      status: AI_VIDEO_SCENE_STATUS.PENDING,
    });

    // Provider that ignores reference images and only uses prompt
    const textOnlyProvider = {
      async generateImage({ prompt }) {
        assert.ok(prompt);
        return {
          provider: "legacy-text-only",
          status: "COMPLETED",
          assetUrl: "https://storage.shaivik.ai/legacy-generated.png",
        };
      },
    };

    const legacyUseCase = new GenerateVideoSceneImageUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoAssetRepository: { create: async (a) => a, findBySceneId: async () => [] },
      videoProviderFactory: { getImageProvider: () => textOnlyProvider },
    });

    const res = await legacyUseCase.execute({ organizationId: "org-1", projectId: project.id, sceneNumber: 1 });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.imageUrl, "https://storage.shaivik.ai/legacy-generated.png");
  });

  // 9. Existing projects without reference images still generate successfully
  await t.test("9. Existing projects without reference images still generate successfully", async () => {
    const { mockProjectRepo, mockSceneRepo, useCase, getLastOptions } = setupTestEnvironment();
    const oldProject = await mockProjectRepo.create({
      organizationId: "org-1",
      name: "Old Legacy Project",
      storyboard: { scenes: [{ sceneNumber: 1, visualPrompt: "Old classic sunrise" }] },
    });
    await mockSceneRepo.create({
      videoProjectId: oldProject.id,
      sceneNumber: 1,
      visualPrompt: "Old classic sunrise",
      characterIds: [],
      status: AI_VIDEO_SCENE_STATUS.PENDING,
    });

    const res = await useCase.execute({ organizationId: "org-1", projectId: oldProject.id, sceneNumber: 1 });
    assert.strictEqual(res.success, true);
    assert.ok(res.imageUrl);
  });

  // 10. Missing/deleted reference image does not crash the entire generation pipeline
  await t.test("10. Missing/deleted reference image in provider does not crash the generation pipeline", async () => {
    const { mockCharRepo, mockProjectRepo, mockSceneRepo } = setupTestEnvironment();
    const char = await mockCharRepo.create({
      organizationId: "org-1",
      name: "Deleted Image Character",
      referenceImageUrl: "https://storage.shaivik.ai/non-existent-404.png",
    });
    const project = await mockProjectRepo.create({
      organizationId: "org-1",
      name: "Resilience Test",
      storyboard: { scenes: [{ sceneNumber: 1, visualPrompt: "Character stands outside" }] },
    });
    await mockSceneRepo.create({
      videoProjectId: project.id,
      sceneNumber: 1,
      visualPrompt: "Character stands outside",
      characterIds: [char.id],
      status: AI_VIDEO_SCENE_STATUS.PENDING,
    });

    // Provider that simulates a reference image download failure (404/deleted) and falls back
    let fallbackTriggered = false;
    const resilientProvider = {
      async generateImage({ prompt, referenceImages }) {
        if (referenceImages?.length > 0) {
          // Simulate fetch failure that is caught and falls back to prompt-only generation
          fallbackTriggered = true;
        }
        return {
          provider: "resilient-image-provider",
          status: "COMPLETED",
          assetUrl: "https://storage.shaivik.ai/resilient-output.png",
        };
      },
    };

    const resilientUseCase = new GenerateVideoSceneImageUseCase({
      videoProjectRepository: mockProjectRepo,
      videoSceneRepository: mockSceneRepo,
      videoCharacterRepository: mockCharRepo,
      videoAssetRepository: { create: async (a) => a, findBySceneId: async () => [] },
      videoProviderFactory: { getImageProvider: () => resilientProvider },
    });

    const res = await resilientUseCase.execute({ organizationId: "org-1", projectId: project.id, sceneNumber: 1 });
    assert.strictEqual(res.success, true);
    assert.strictEqual(fallbackTriggered, true);
    assert.strictEqual(res.imageUrl, "https://storage.shaivik.ai/resilient-output.png");
  });
});

