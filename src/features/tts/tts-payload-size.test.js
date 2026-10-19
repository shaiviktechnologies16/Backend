import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import http from "node:http";
import createTTSRoutes from "./routes/tts.routes.js";
import { errorMiddleware } from "../../common/middleware/error.middleware.js";

// Helper to start ephemeral server for testing
function startTestServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((res) => server.close(res)),
      });
    });
  });
}

test("TTS routes: normal text-only request is accepted", async () => {
  const mockJobController = {
    create: (req, res) =>
      res.status(202).json({ id: "job-123", status: "queued" }),
    getEngineConfig: (req, res) => res.json({}),
    updateEngineConfig: (req, res) => res.json({}),
    listOutputs: (req, res) => res.json({ files: [] }),
    downloadOutputAudio: (req, res) => res.end(),
    deleteOutput: (req, res) => res.end(),
    cloneVoice: (req, res) => res.json({}),
    getById: (req, res) => res.json({}),
    downloadAudio: (req, res) => res.end(),
    createBatchJob: (req, res) => res.json({}),
    getBatchJob: (req, res) => res.json({}),
    downloadBatchZip: (req, res) => res.end(),
  };

  const app = express();
  // Mimic app.js route bypass
  app.use((req, res, next) => {
    if (req.originalUrl?.startsWith("/api/v1/tts")) return next();
    express.json()(req, res, next);
  });

  const mockAuth = (req, res, next) => {
    req.user = { id: "test-user-id" };
    next();
  };

  app.use(
    "/api/v1/tts",
    createTTSRoutes({
      controller: { synthesize: (req, res) => res.end() },
      jobController: mockJobController,
      middleware: [mockAuth],
    }),
  );
  app.use(errorMiddleware);

  const testServer = await startTestServer(app);
  try {
    const res = await fetch(`${testServer.url}/api/v1/tts/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello world" }),
    });

    assert.equal(res.status, 202);
    const data = await res.json();
    assert.equal(data.id, "job-123");
  } finally {
    await testServer.close();
  }
});

test("TTS routes: reference audio > 100 KB (approx 600 KB payload) is accepted by route-specific body parser", async () => {
  const mockJobController = {
    create: (req, res) => {
      assert.ok(req.body.reference_audio_base64);
      assert.ok(req.body.reference_audio_base64.length > 500000);
      return res.status(202).json({ id: "job-audio-600k", status: "queued" });
    },
    getEngineConfig: (req, res) => res.json({}),
    updateEngineConfig: (req, res) => res.json({}),
    listOutputs: (req, res) => res.json({ files: [] }),
    downloadOutputAudio: (req, res) => res.end(),
    deleteOutput: (req, res) => res.end(),
    cloneVoice: (req, res) => res.json({}),
    getById: (req, res) => res.json({}),
    downloadAudio: (req, res) => res.end(),
    createBatchJob: (req, res) => res.json({}),
    getBatchJob: (req, res) => res.json({}),
    downloadBatchZip: (req, res) => res.end(),
  };

  const app = express();
  // Mimic app.js global 100kb parser with /api/v1/tts bypass
  app.use((req, res, next) => {
    if (req.originalUrl?.startsWith("/api/v1/tts")) return next();
    express.json({ limit: "100kb" })(req, res, next);
  });

  const mockAuth = (req, res, next) => {
    req.user = { id: "test-user-id" };
    next();
  };

  app.use(
    "/api/v1/tts",
    createTTSRoutes({
      controller: { synthesize: (req, res) => res.end() },
      jobController: mockJobController,
      middleware: [mockAuth],
    }),
  );
  app.use(errorMiddleware);

  const testServer = await startTestServer(app);
  try {
    // Generate ~600 KB Base64 audio string (which exceeds global 100kb limit)
    const largeAudioBase64 = Buffer.alloc(450 * 1024, "A").toString("base64");
    assert.ok(largeAudioBase64.length > 500000);

    const res = await fetch(`${testServer.url}/api/v1/tts/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "నమస్కారం! శైవిక్ ఏఐకి స్వాగతం.",
        reference_audio_base64: `data:audio/wav;base64,${largeAudioBase64}`,
      }),
    });

    assert.equal(res.status, 202);
    const data = await res.json();
    assert.equal(data.id, "job-audio-600k");
  } finally {
    await testServer.close();
  }
});

test("TTS routes: unauthenticated request is rejected with 401 without parsing large body", async () => {
  let bodyParsed = false;
  const mockJobController = {
    create: (req, res) => {
      bodyParsed = true;
      res.status(202).json({ id: "job" });
    },
    getEngineConfig: (req, res) => res.json({}),
    updateEngineConfig: (req, res) => res.json({}),
    listOutputs: (req, res) => res.json({ files: [] }),
    downloadOutputAudio: (req, res) => res.end(),
    deleteOutput: (req, res) => res.end(),
    cloneVoice: (req, res) => res.json({}),
    getById: (req, res) => res.json({}),
    downloadAudio: (req, res) => res.end(),
    createBatchJob: (req, res) => res.json({}),
    getBatchJob: (req, res) => res.json({}),
    downloadBatchZip: (req, res) => res.end(),
  };

  const app = express();
  const rejectingAuth = (req, res) => {
    return res
      .status(401)
      .json({ success: false, message: "Authorization header is required." });
  };

  app.use(
    "/api/v1/tts",
    createTTSRoutes({
      controller: { synthesize: (req, res) => res.end() },
      jobController: mockJobController,
      middleware: [rejectingAuth],
    }),
  );
  app.use(errorMiddleware);

  const testServer = await startTestServer(app);
  try {
    const res = await fetch(`${testServer.url}/api/v1/tts/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello", reference_audio_base64: "AAAA" }),
    });

    assert.equal(res.status, 401);
    assert.equal(bodyParsed, false);
  } finally {
    await testServer.close();
  }
});

test("TTS routes: oversized payload (> 25MB body) returns HTTP 413 rather than 500", async () => {
  const originalMax = process.env.TTS_MAX_BODY_SIZE;
  // Set tiny limit for testing 413 handling
  process.env.TTS_MAX_BODY_SIZE = "50kb";

  const mockJobController = {
    create: (req, res) => res.status(202).json({ id: "ok" }),
    getEngineConfig: (req, res) => res.json({}),
    updateEngineConfig: (req, res) => res.json({}),
    listOutputs: (req, res) => res.json({ files: [] }),
    downloadOutputAudio: (req, res) => res.end(),
    deleteOutput: (req, res) => res.end(),
    cloneVoice: (req, res) => res.json({}),
    getById: (req, res) => res.json({}),
    downloadAudio: (req, res) => res.end(),
    createBatchJob: (req, res) => res.json({}),
    getBatchJob: (req, res) => res.json({}),
    downloadBatchZip: (req, res) => res.end(),
  };

  const app = express();
  const allowAuth = (req, res, next) => next();

  app.use(
    "/api/v1/tts",
    createTTSRoutes({
      controller: { synthesize: (req, res) => res.end() },
      jobController: mockJobController,
      middleware: [allowAuth],
    }),
  );
  app.use(errorMiddleware);

  const testServer = await startTestServer(app);
  try {
    // 70 KB payload to trigger > 50kb limit
    const bigPayload = "X".repeat(70 * 1024);
    const res = await fetch(`${testServer.url}/api/v1/tts/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: bigPayload }),
    });

    assert.equal(res.status, 413);
    const data = await res.json();
    assert.equal(data.error.code, "PAYLOAD_TOO_LARGE");
  } finally {
    if (originalMax) process.env.TTS_MAX_BODY_SIZE = originalMax;
    else delete process.env.TTS_MAX_BODY_SIZE;
    await testServer.close();
  }
});

test("Controller: rejects reference audio > 15 MB decoded bytes with HTTP 413", async () => {
  const { createTtsJobController } =
    await import("./presentation/controllers/tts-job.controller.js");
  const controller = createTtsJobController({
    createTtsJobUseCase: { execute: async () => ({ id: "1" }) },
    getTtsJobUseCase: {},
    ttsJobRepository: {},
    ttsJobProcessor: { process: async () => {} },
  });

  // Base64 string representing ~16 MB of decoded bytes
  const fakeBase64Length = Math.ceil((16 * 1024 * 1024 * 4) / 3);
  const oversizedBase64 = "A".repeat(fakeBase64Length);

  let responseStatus = null;
  let responseData = null;
  const mockRes = {
    status(s) {
      responseStatus = s;
      return this;
    },
    json(d) {
      responseData = d;
      return this;
    },
  };

  await controller.create(
    {
      user: { id: "user-1" },
      body: { text: "Hello", reference_audio_base64: oversizedBase64 },
    },
    mockRes,
    () => {},
  );

  assert.equal(responseStatus, 413);
  assert.equal(responseData?.error?.code, "PAYLOAD_TOO_LARGE");
  assert.match(responseData?.error?.message, /15 MB/);
});

test("Controller: accepts IndicF5 options and preserves parameters", async () => {
  const { createTtsJobController } =
    await import("./presentation/controllers/tts-job.controller.js");
  let capturedOptions = null;
  const controller = createTtsJobController({
    createTtsJobUseCase: {
      execute: async ({ options }) => {
        capturedOptions = options;
        return { id: "job-indicf5", status: "queued" };
      },
    },
    getTtsJobUseCase: {},
    ttsJobRepository: {},
    ttsJobProcessor: { process: async () => {} },
  });

  let responseStatus = null;
  let responseData = null;
  const mockRes = {
    status(s) {
      responseStatus = s;
      return this;
    },
    json(d) {
      responseData = d;
      return this;
    },
  };

  await controller.create(
    {
      user: { id: "user-1" },
      body: {
        text: "నమస్కారం",
        provider: "indicf5",
        voice_mode: "preset",
        preset_voice: "te-female-1",
        speed: 1.0,
        steps: 8,
      },
    },
    mockRes,
    () => {},
  );

  assert.equal(responseStatus, 202);
  assert.equal(responseData.id, "job-indicf5");
  assert.equal(capturedOptions.provider, "indicf5");
  assert.equal(capturedOptions.presetVoice, "te-female-1");
  assert.equal(capturedOptions.steps, 8);
});

test("Public TTS routes: normal text request is accepted on /api/v1/public/tts and /api/tts", async () => {
  const { createPublicTTSRoutes } = await import("./routes/public-tts.routes.js");
  const { createPublicTtsController } = await import("./controller/public-tts.controller.js");
  const { TtsDemoGuardService } = await import("./service/tts-demo-guard.service.js");

  const guard = new TtsDemoGuardService();
  const mockUseCase = {
    async execute({ text }) {
      return {
        audio: Buffer.from("audio-bytes"),
        contentType: "audio/mpeg",
        format: "mp3",
      };
    },
  };
  const publicTtsController = createPublicTtsController({
    synthesizeSpeechUseCase: mockUseCase,
    ttsDemoGuardService: guard,
  });

  const app = express();
  // Exact bypass logic as in app.js
  app.use((req, res, next) => {
    const url = req.originalUrl || req.url || req.path || "";
    if (
      url.startsWith("/api/v1/tts") ||
      url.startsWith("/api/v1/public/tts") ||
      url.startsWith("/api/public/tts") ||
      url.startsWith("/api/tts")
    ) {
      return next();
    }
    return express.json({ limit: "100kb" })(req, res, next);
  });

  app.use(
    ["/api/v1/public/tts", "/api/public/tts", "/api/tts"],
    createPublicTTSRoutes({ publicTtsController }),
  );
  app.use(errorMiddleware);

  const testServer = await startTestServer(app);
  try {
    // Test /api/v1/public/tts/generate
    const res1 = await fetch(`${testServer.url}/api/v1/public/tts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Testing public TTS" }),
    });
    assert.equal(res1.status, 200);

    // Test direct /api/tts/generate alias
    const res2 = await fetch(`${testServer.url}/api/tts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Testing alias" }),
    });
    assert.equal(res2.status, 200);
  } finally {
    await testServer.close();
  }
});

test("Public TTS routes: reference audio > 100 KB (approx 600 KB payload) bypasses global parser and succeeds", async () => {
  const { createPublicTTSRoutes } = await import("./routes/public-tts.routes.js");
  const { createPublicTtsController } = await import("./controller/public-tts.controller.js");
  const { TtsDemoGuardService } = await import("./service/tts-demo-guard.service.js");

  let receivedAudio = null;
  const guard = new TtsDemoGuardService();
  const mockUseCase = {
    async execute({ text, options }) {
      receivedAudio = options.referenceAudioBase64;
      return {
        audio: Buffer.from("cloned-audio-bytes"),
        contentType: "audio/mpeg",
        format: "mp3",
      };
    },
  };
  const publicTtsController = createPublicTtsController({
    synthesizeSpeechUseCase: mockUseCase,
    ttsDemoGuardService: guard,
  });

  const app = express();
  app.use((req, res, next) => {
    const url = req.originalUrl || req.url || req.path || "";
    if (
      url.startsWith("/api/v1/tts") ||
      url.startsWith("/api/v1/public/tts") ||
      url.startsWith("/api/public/tts") ||
      url.startsWith("/api/tts")
    ) {
      return next();
    }
    return express.json({ limit: "100kb" })(req, res, next);
  });

  app.use(
    ["/api/v1/public/tts", "/api/public/tts", "/api/tts"],
    createPublicTTSRoutes({ publicTtsController }),
  );
  app.use(errorMiddleware);

  const testServer = await startTestServer(app);
  try {
    // Generate ~600 KB Base64 audio payload
    const largeAudioBase64 = Buffer.alloc(450 * 1024, "A").toString("base64");
    assert.ok(largeAudioBase64.length > 500000);

    const res = await fetch(`${testServer.url}/api/tts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Custom clone audio test",
        referenceAudioBase64: `data:audio/wav;base64,${largeAudioBase64}`,
      }),
    });

    assert.equal(res.status, 200);
    assert.ok(receivedAudio);
    assert.ok(receivedAudio.length > 500000);
  } finally {
    await testServer.close();
  }
});

test("Public TTS routes: oversized payload (> limit) returns clean HTTP 413 with PAYLOAD_TOO_LARGE", async () => {
  const originalLimit = process.env.PUBLIC_TTS_MAX_BODY_SIZE;
  process.env.PUBLIC_TTS_MAX_BODY_SIZE = "50kb";

  const { createPublicTTSRoutes } = await import("./routes/public-tts.routes.js");
  const { createPublicTtsController } = await import("./controller/public-tts.controller.js");
  const { TtsDemoGuardService } = await import("./service/tts-demo-guard.service.js");

  const guard = new TtsDemoGuardService();
  const mockUseCase = {
    async execute() {
      return { audio: Buffer.from("audio"), contentType: "audio/mpeg" };
    },
  };
  const publicTtsController = createPublicTtsController({
    synthesizeSpeechUseCase: mockUseCase,
    ttsDemoGuardService: guard,
  });

  const app = express();
  app.use((req, res, next) => {
    const url = req.originalUrl || req.url || req.path || "";
    if (
      url.startsWith("/api/v1/tts") ||
      url.startsWith("/api/v1/public/tts") ||
      url.startsWith("/api/public/tts") ||
      url.startsWith("/api/tts")
    ) {
      return next();
    }
    return express.json({ limit: "100kb" })(req, res, next);
  });

  app.use(
    ["/api/v1/public/tts", "/api/public/tts", "/api/tts"],
    createPublicTTSRoutes({ publicTtsController }),
  );
  app.use(errorMiddleware);

  const testServer = await startTestServer(app);
  try {
    const bigPayload = "X".repeat(70 * 1024);
    const res = await fetch(`${testServer.url}/api/tts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello", referenceAudioBase64: bigPayload }),
    });

    assert.equal(res.status, 413);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, "PAYLOAD_TOO_LARGE");
    assert.match(data.error.message, /exceeds the maximum allowed limit/);
  } finally {
    if (originalLimit) process.env.PUBLIC_TTS_MAX_BODY_SIZE = originalLimit;
    else delete process.env.PUBLIC_TTS_MAX_BODY_SIZE;
    await testServer.close();
  }
});

test("Public TTS routes: reference audio > 15 MB decoded size is rejected with HTTP 413", async () => {
  const { createPublicTtsController } = await import("./controller/public-tts.controller.js");
  const { TtsDemoGuardService } = await import("./service/tts-demo-guard.service.js");

  const guard = new TtsDemoGuardService();
  const mockUseCase = {
    async execute() {
      return { audio: Buffer.from("audio"), contentType: "audio/mpeg" };
    },
  };
  const controller = createPublicTtsController({
    synthesizeSpeechUseCase: mockUseCase,
    ttsDemoGuardService: guard,
  });

  const fakeBase64Length = Math.ceil((16 * 1024 * 1024 * 4) / 3);
  const oversizedBase64 = "A".repeat(fakeBase64Length);

  let responseStatus = null;
  let responseData = null;
  const mockRes = {
    status(s) {
      responseStatus = s;
      return this;
    },
    json(d) {
      responseData = d;
      return this;
    },
  };

  await controller.synthesize(
    {
      headers: { "x-visitor-id": "visitor-oversized" },
      body: { text: "Hello world", referenceAudioBase64: oversizedBase64 },
    },
    mockRes,
  );

  assert.equal(responseStatus, 413);
  assert.equal(responseData.success, false);
  assert.equal(responseData.error.code, "PAYLOAD_TOO_LARGE");
  assert.match(responseData.error.message, /15 MB/);
});

test("Global security preserved: non-TTS route with > 100 KB payload is blocked by global parser", async () => {
  const app = express();
  app.use((req, res, next) => {
    const url = req.originalUrl || req.url || req.path || "";
    if (
      url.startsWith("/api/v1/tts") ||
      url.startsWith("/api/v1/public/tts") ||
      url.startsWith("/api/public/tts") ||
      url.startsWith("/api/tts")
    ) {
      return next();
    }
    return express.json({ limit: "100kb" })(req, res, next);
  });

  app.post("/api/other/data", (req, res) => res.json({ success: true }));
  app.use(errorMiddleware);

  const testServer = await startTestServer(app);
  try {
    const bigPayload = "X".repeat(120 * 1024);
    const res = await fetch(`${testServer.url}/api/other/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: bigPayload }),
    });

    assert.equal(res.status, 413);
    const data = await res.json();
    assert.equal(data.error.code, "PAYLOAD_TOO_LARGE");
  } finally {
    await testServer.close();
  }
});
