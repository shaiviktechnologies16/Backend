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
