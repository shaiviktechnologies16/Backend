import test from "node:test";
import assert from "node:assert/strict";
import { createPublicTtsController } from "./public-tts.controller.js";
import { TtsDemoGuardService } from "../service/tts-demo-guard.service.js";

test("publicTtsController.getStatus returns 200 with available quota", async () => {
  const guard = new TtsDemoGuardService({
    globalDailyLimit: 40,
    visitorDailyLimit: 5,
    maxCharacters: 500,
  });

  const controller = createPublicTtsController({
    synthesizeSpeechUseCase: {},
    ttsDemoGuardService: guard,
  });

  let statusSent = null;
  let jsonSent = null;

  const req = {
    headers: { "x-visitor-id": "vis-101" },
  };
  const res = {
    status(code) {
      statusSent = code;
      return this;
    },
    json(data) {
      jsonSent = data;
      return this;
    },
  };

  await controller.getStatus(req, res);

  assert.equal(statusSent, 200);
  assert.equal(jsonSent.success, true);
  assert.equal(jsonSent.data.isAvailable, true);
  assert.equal(jsonSent.data.maxCharacters, 500);
  assert.equal(jsonSent.data.visitorRemaining, 5);
  assert.equal(jsonSent.data.globalRemaining, 40);
  assert.equal(jsonSent.data.voice, "Shaivik AI Studio Voice");
});

test("publicTtsController.synthesize validates empty text with 400", async () => {
  const guard = new TtsDemoGuardService({});
  const controller = createPublicTtsController({
    synthesizeSpeechUseCase: {},
    ttsDemoGuardService: guard,
  });

  let statusSent = null;
  let jsonSent = null;
  const res = {
    status(code) {
      statusSent = code;
      return this;
    },
    json(data) {
      jsonSent = data;
      return this;
    },
  };

  await controller.synthesize({ headers: {}, body: { text: "   " } }, res);

  assert.equal(statusSent, 400);
  assert.equal(jsonSent.success, false);
  assert.equal(jsonSent.error.code, "VALIDATION_ERROR");
});

test("publicTtsController.synthesize rejects text exceeding 500 characters with 400", async () => {
  const guard = new TtsDemoGuardService({ maxCharacters: 500 });
  const controller = createPublicTtsController({
    synthesizeSpeechUseCase: {},
    ttsDemoGuardService: guard,
  });

  let statusSent = null;
  let jsonSent = null;
  const res = {
    status(code) {
      statusSent = code;
      return this;
    },
    json(data) {
      jsonSent = data;
      return this;
    },
  };

  const longText = "A".repeat(501);
  await controller.synthesize({ headers: {}, body: { text: longText } }, res);

  assert.equal(statusSent, 400);
  assert.equal(jsonSent.success, false);
  assert.equal(jsonSent.error.code, "TEXT_TOO_LONG");
});

test("publicTtsController.synthesize succeeds and sets audio/mpeg headers", async () => {
  const guard = new TtsDemoGuardService({ visitorDailyLimit: 5 });
  const fakeAudio = Buffer.from("fake-mp3-audio-bytes");

  const mockUseCase = {
    async execute({ text, options }) {
      assert.equal(options.provider, "fish_audio");
      return {
        audio: fakeAudio,
        contentType: "audio/mpeg",
        format: "mp3",
        filename: "test-speech.mp3",
      };
    },
  };

  const controller = createPublicTtsController({
    synthesizeSpeechUseCase: mockUseCase,
    ttsDemoGuardService: guard,
  });

  const headers = {};
  let bodySent = null;

  const res = {
    setHeader(key, value) {
      headers[key.toLowerCase()] = value;
      return this;
    },
    send(data) {
      bodySent = data;
      return this;
    },
  };

  await controller.synthesize(
    {
      headers: { "x-visitor-id": "visitor-pass" },
      body: { text: "Hello, this is a test audio generation." },
    },
    res,
  );

  assert.equal(headers["content-type"], "audio/mpeg");
  assert.ok(headers["content-disposition"].includes("test-speech.mp3"));
  assert.equal(headers["x-daily-remaining"], "4");
  assert.equal(bodySent, fakeAudio);
});

test("publicTtsController.synthesize handles provider quota exhaustion with 429", async () => {
  const guard = new TtsDemoGuardService({});

  const mockUseCase = {
    async execute() {
      const err = new Error("Rate limit exceeded: free-models-per-day");
      err.statusCode = 429;
      throw err;
    },
  };

  const controller = createPublicTtsController({
    synthesizeSpeechUseCase: mockUseCase,
    ttsDemoGuardService: guard,
  });

  let statusSent = null;
  let jsonSent = null;

  const res = {
    status(code) {
      statusSent = code;
      return this;
    },
    json(data) {
      jsonSent = data;
      return this;
    },
  };

  await controller.synthesize(
    {
      headers: { "x-visitor-id": "visitor-quota" },
      body: { text: "Will fail with quota error" },
    },
    res,
  );

  assert.equal(statusSent, 429);
  assert.equal(jsonSent.success, false);
  assert.equal(jsonSent.error.code, "PROVIDER_QUOTA_EXHAUSTED");
});

