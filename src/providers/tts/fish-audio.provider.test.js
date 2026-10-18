import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  FishAudioProvider,
  REFERENCE_TEXT,
  detectAudioMimeFromBuffer,
  normalizeReferenceAudio,
  resolveFishAudioReference,
} from "./fish-audio/fish-audio.provider.js";
import { createTTSProviderFactory } from "./tts.provider.factory.js";
import { SynthesizeSpeechUseCase } from "../../features/tts/application/usecase/synthesize-speech.usecase.js";
import { createTTSController } from "../../features/tts/controller/tts.controller.js";
import { createTtsJobController } from "../../features/tts/presentation/controllers/tts-job.controller.js";
import { TtsJobProcessor } from "../../features/tts/service/tts-job.processor.js";

test("FishAudioProvider has correct provider name", () => {
  const provider = new FishAudioProvider();
  assert.equal(provider.name, "fish_audio");
});

test("createTTSProviderFactory resolves fish_audio and aliases", async () => {
  const mockConfig = {
    getValue: async (key) => (key === "TTS_PROVIDER" ? "fish_audio" : null),
  };
  const factory = createTTSProviderFactory({
    getPlatformConfigUseCase: mockConfig,
  });

  const provider = await factory.getProvider();
  assert.equal(provider.name, "fish_audio");

  const byName1 = factory.getProviderByName("fish_audio");
  assert.equal(byName1?.name, "fish_audio");

  const byName2 = factory.getProviderByName("fish-audio");
  assert.equal(byName2?.name, "fish_audio");

  const byNameIndic = factory.getProviderByName("indicf5");
  assert.equal(byNameIndic?.name, "indicf5");
});

test("detectAudioMimeFromBuffer recognizes common audio signatures", () => {
  // WAV header
  const wavBuf = Buffer.alloc(16);
  wavBuf.write("RIFF", 0, "ascii");
  wavBuf.write("WAVE", 8, "ascii");
  assert.equal(detectAudioMimeFromBuffer(wavBuf), "audio/wav");

  // FLAC header
  const flacBuf = Buffer.alloc(16);
  flacBuf.write("fLaC", 0, "ascii");
  assert.equal(detectAudioMimeFromBuffer(flacBuf), "audio/flac");

  // OGG header
  const oggBuf = Buffer.alloc(16);
  oggBuf.write("OggS", 0, "ascii");
  assert.equal(detectAudioMimeFromBuffer(oggBuf), "audio/ogg");

  // MP3 ID3 header
  const mp3Id3Buf = Buffer.alloc(16);
  mp3Id3Buf.write("ID3", 0, "ascii");
  assert.equal(detectAudioMimeFromBuffer(mp3Id3Buf), "audio/mpeg");

  // M4A ftyp header
  const m4aBuf = Buffer.alloc(16);
  m4aBuf.write("ftyp", 4, "ascii");
  assert.equal(detectAudioMimeFromBuffer(m4aBuf), "audio/mp4");

  // WebM header
  const webmBuf = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  assert.equal(detectAudioMimeFromBuffer(webmBuf), "audio/webm");
});

test("normalizeReferenceAudio formats data URI correctly", () => {
  const wavBuf = Buffer.alloc(16);
  wavBuf.write("RIFF", 0, "ascii");
  wavBuf.write("WAVE", 8, "ascii");
  const b64 = wavBuf.toString("base64");

  const result = normalizeReferenceAudio(b64);
  assert.equal(result.startsWith("data:audio/wav;base64,"), true);
});

test("normalizeReferenceAudio rejects corrupt and non-audio data", () => {
  // Random text
  const textBuf = Buffer.from("Hello world, this is a plain text file, not audio.");
  assert.throws(
    () => {
      normalizeReferenceAudio(textBuf.toString("base64"));
    },
    {
      name: "ProviderError",
      message: /Invalid audio format/,
    },
  );

  // Empty buffer
  assert.throws(
    () => {
      normalizeReferenceAudio("   ");
    },
    {
      name: "ProviderError",
      message: /empty/,
    },
  );
});

test("FishAudioProvider rejects empty text with ProviderError", async () => {
  const provider = new FishAudioProvider();
  await assert.rejects(
    async () => {
      await provider.synthesize("");
    },
    {
      name: "ProviderError",
      message: "Text is required for speech synthesis.",
    },
  );
});

test("FishAudioProvider throws actionable error when API key is missing", async () => {
  const provider = new FishAudioProvider({
    getPlatformConfigUseCase: { getValue: async () => null },
  });
  provider.resolveApiKey = async () => null;
  provider.resolveSpeechUrl = async () => "https://openrouter.ai/api/v1/audio/speech";

  await assert.rejects(
    async () => {
      await provider.synthesize("నమస్కారం", {});
    },
    {
      name: "ProviderError",
      message: /TTS API key is not configured/,
    },
  );
});

test("FishAudioProvider resolveSpeechUrl reads URL from env with no hardcoded fallback", async () => {
  const originalUrl = process.env.FISH_AUDIO_API_URL;
  const originalSpeechUrl = process.env.OPENROUTER_SPEECH_URL;

  delete process.env.FISH_AUDIO_API_URL;
  delete process.env.OPENROUTER_SPEECH_URL;
  delete process.env.TTS_API_URL;
  delete process.env.HUGGINGFACE_TTS_URL;

  const provider = new FishAudioProvider();

  await assert.rejects(
    async () => {
      await provider.resolveSpeechUrl();
    },
    {
      name: "ProviderError",
      message: /TTS API URL is not configured/,
    },
  );

  process.env.FISH_AUDIO_API_URL = "https://custom-tts.shaiviktechnologies.in/api";
  assert.equal(
    await provider.resolveSpeechUrl(),
    "https://custom-tts.shaiviktechnologies.in/api",
  );

  if (originalUrl) process.env.FISH_AUDIO_API_URL = originalUrl;
  else delete process.env.FISH_AUDIO_API_URL;
  if (originalSpeechUrl) process.env.OPENROUTER_SPEECH_URL = originalSpeechUrl;
});

test("FishAudioProvider resolveApiKey supports Hugging-Face-TTS key token from env", async () => {
  const originalKey = process.env["Hugging-Face-TTS"];
  const originalOrKey = process.env.OPENROUTER_API_KEY;

  delete process.env.OPENROUTER_API_KEY;
  delete process.env.FISH_AUDIO_API_KEY;
  process.env["Hugging-Face-TTS"] = "REDACTED_HUGGING_FACE_TOKEN";

  const provider = new FishAudioProvider();
  const resolvedKey = await provider.resolveApiKey("https://api-inference.huggingface.co/models");
  assert.equal(resolvedKey, "REDACTED_HUGGING_FACE_TOKEN");

  if (originalKey) process.env["Hugging-Face-TTS"] = originalKey;
  if (originalOrKey) process.env.OPENROUTER_API_KEY = originalOrKey;
});

test("FishAudioProvider resolveModel defaults to fish-audio/s2.1-pro-free:free", async () => {
  const originalEnvModel = process.env.FISH_AUDIO_MODEL;
  delete process.env.FISH_AUDIO_MODEL;

  const provider = new FishAudioProvider();
  const model = await provider.resolveModel();
  assert.equal(model, "fish-audio/s2.1-pro-free:free");

  if (originalEnvModel) process.env.FISH_AUDIO_MODEL = originalEnvModel;
});

test("REQUIREMENT 1: Uploaded reference audio takes priority over local fallback", async () => {
  const customWav = Buffer.alloc(32);
  customWav.write("RIFF", 0, "ascii");
  customWav.write("WAVE", 8, "ascii");
  customWav.write("USER_RECORDING_BYTES", 12, "ascii");
  const customB64 = customWav.toString("base64");
  const customTranscript = "యూజర్ మాట్లాడిన మాటలు";

  const resolved = await resolveFishAudioReference({
    referenceAudioBase64: customB64,
    referenceText: customTranscript,
  });

  assert.equal(resolved.source, "uploaded");
  assert.equal(resolved.byteLength, 32);
  assert.equal(resolved.mimeType, "audio/wav");
  assert.equal(resolved.transcript, customTranscript);
  assert.ok(resolved.dataUri.startsWith("data:audio/wav;base64,"));
});

test("REQUIREMENT 2 & 4: Missing uploaded audio triggers local reference.wav fallback with exact 6-sentence REFERENCE_TEXT", async () => {
  const resolved = await resolveFishAudioReference({});

  assert.equal(resolved.source, "local_fallback");
  assert.ok(resolved.filePath.endsWith("local-tts/reference.wav"));
  assert.equal(resolved.mimeType, "audio/wav");
  assert.ok(resolved.byteLength > 100000);
  assert.equal(resolved.transcript, REFERENCE_TEXT);
  assert.ok(resolved.transcript.includes("హాయ్ ఫ్రెండ్స్!"));
  assert.ok(resolved.transcript.includes("మీ లక్ష్యంపై ఫోకస్ పెట్టండి."));
  assert.ok(resolved.transcript.includes("ఆగకుండా ముందుకు సాగండి."));
  assert.ok(resolved.transcript.includes("మీ కలను నిజం చేసేది ఇంకెవరో కాదు — మీరే!"));
  assert.ok(resolved.dataUri.startsWith("data:audio/wav;base64,"));
});

test("TASK 7: Correct transcript selection across uploaded vs fallback modes", async () => {
  const customWav = Buffer.alloc(16);
  customWav.write("RIFF", 0, "ascii");
  customWav.write("WAVE", 8, "ascii");
  const b64 = customWav.toString("base64");

  // Mode 1: Uploaded audio with custom transcript
  const res1 = await resolveFishAudioReference({
    referenceAudioBase64: b64,
    referenceText: "నా కస్టమ్ టెక్స్ట్",
  });
  assert.equal(res1.source, "uploaded");
  assert.equal(res1.transcript, "నా కస్టమ్ టెక్స్ట్");

  // Mode 2: Uploaded audio WITHOUT custom transcript -> must be null, never use REFERENCE_TEXT
  const res2 = await resolveFishAudioReference({
    referenceAudioBase64: b64,
  });
  assert.equal(res2.source, "uploaded");
  assert.equal(res2.transcript, null);

  // Mode 3: Local fallback -> must use full REFERENCE_TEXT
  const res3 = await resolveFishAudioReference({});
  assert.equal(res3.source, "local_fallback");
  assert.equal(res3.transcript, REFERENCE_TEXT);

  // Mode 4: Controlled comparison unconditioned baseline
  const res4 = await resolveFishAudioReference({ unconditioned: true });
  assert.equal(res4, null);
});

test("REQUIREMENT 3: Missing both references causes an explicit error for custom_clone", async () => {
  const originalEnv = process.env.FISH_AUDIO_DEFAULT_REFERENCE_PATH;
  process.env.FISH_AUDIO_DEFAULT_REFERENCE_PATH = "/tmp/non-existent-reference-file-path-123.wav";

  try {
    await assert.rejects(
      async () => {
        await resolveFishAudioReference({});
      },
      {
        name: "ProviderError",
        message: /Reference audio is required for custom voice cloning/,
      },
    );
  } finally {
    if (originalEnv) process.env.FISH_AUDIO_DEFAULT_REFERENCE_PATH = originalEnv;
    else delete process.env.FISH_AUDIO_DEFAULT_REFERENCE_PATH;
  }
});

test("REQUIREMENT 5 & 8: Outgoing OpenRouter request contains reference audio and never falls back to generic speech", async () => {
  const provider = new FishAudioProvider();
  provider.resolveSpeechUrl = async () => "https://openrouter.ai/api/v1/audio/speech";
  provider.resolveApiKey = async () => "dummy-test-key";

  const originalFetch = globalThis.fetch;
  let interceptedUrl = null;
  let interceptedOptions = null;

  globalThis.fetch = async (url, options) => {
    interceptedUrl = url;
    interceptedOptions = options;
    const dummyAudio = Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]);
    return {
      ok: true,
      status: 200,
      headers: { get: () => "audio/mpeg" },
      arrayBuffer: async () => dummyAudio.buffer,
    };
  };

  try {
    const teluguInput = "నమస్కారం! శైవిక్ ఏఐకి స్వాగతం.";
    // Call synthesize without uploaded audio -> must trigger local fallback
    const result = await provider.synthesize(teluguInput, {
      voiceMode: "custom_clone",
    });

    assert.equal(interceptedUrl, "https://openrouter.ai/api/v1/audio/speech");
    const body = JSON.parse(interceptedOptions.body);

    assert.equal(body.model, "fish-audio/s2.1-pro-free:free");
    assert.equal(body.input, teluguInput);
    assert.equal(body.response_format, "mp3");
    assert.equal(body.voice, undefined);
    assert.equal(Array.isArray(body.input_references), true);
    assert.equal(body.input_references.length, 2);
    assert.equal(body.input_references[0].type, "input_audio");
    assert.ok(body.input_references[0].input_audio.data.startsWith("data:audio/wav;base64,"));
    assert.equal(body.input_references[1].type, "text");
    assert.equal(body.input_references[1].text, REFERENCE_TEXT);
    assert.equal(result.referenceSource, "local_fallback");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("REQUIREMENT 6: Reference data survives controller, use case, and processor layers", async () => {
  let capturedOptions = null;
  const mockProvider = {
    name: "fish_audio",
    synthesize: async (text, options) => {
      capturedOptions = options;
      return {
        audio: Buffer.from("dummy-audio"),
        filename: "test.mp3",
        contentType: "audio/mpeg",
        outputPath: "/tmp/test.mp3",
      };
    },
  };

  const factory = {
    getProviderByName: () => mockProvider,
    getProvider: async () => mockProvider,
  };

  const usecase = new SynthesizeSpeechUseCase({ ttsProviderFactory: factory });

  // 1. Test direct controller pass-through
  const controller = createTTSController({ synthesizeSpeechUseCase: usecase });
  const customWav = Buffer.alloc(16);
  customWav.write("RIFF", 0, "ascii");
  customWav.write("WAVE", 8, "ascii");
  const base64Audio = customWav.toString("base64");

  const req = {
    body: {
      text: "నమస్కారం",
      provider: "fish_audio",
      voiceMode: "custom_clone",
      referenceAudioBase64: base64Audio,
      referenceText: "నా స్వర నమూనా",
    },
  };
  const res = {
    setHeader: () => {},
    send: () => {},
  };

  await controller.synthesize(req, res, () => {});

  assert.equal(capturedOptions.referenceAudioBase64, base64Audio);
  assert.equal(capturedOptions.referenceText, "నా స్వర నమూనా");
  assert.equal(capturedOptions.voiceMode, "custom_clone");
  assert.equal(capturedOptions.provider, "fish_audio");

  // 2. Test job processor pass-through
  capturedOptions = null;
  const mockRepo = {
    findById: async () => ({
      id: "job-123",
      text: "నమస్కారం",
      status: "queued",
      options: {
        provider: "fish_audio",
        voiceMode: "custom_clone",
        referenceAudioBase64: base64Audio,
        referenceText: "నా స్వర నమూనా",
      },
    }),
    markProcessing: async () => {},
    updateProgress: async () => {},
    markCompleted: async () => {},
  };

  const processor = new TtsJobProcessor({
    ttsJobRepository: mockRepo,
    synthesizeSpeechUseCase: usecase,
  });

  await processor.process("job-123");

  assert.equal(capturedOptions.referenceAudioBase64, base64Audio);
  assert.equal(capturedOptions.referenceText, "నా స్వర నమూనా");
});

test("FishAudioProvider never falls back to IndicF5 on API error", async () => {
  const provider = new FishAudioProvider();
  provider.resolveSpeechUrl = async () => "https://openrouter.ai/api/v1/audio/speech";
  provider.resolveApiKey = async () => "dummy-test-key";

  const originalFetch = globalThis.fetch;
  let fetchCount = 0;

  globalThis.fetch = async (url) => {
    fetchCount++;
    assert.ok(url.includes("openrouter.ai"));
    assert.ok(!url.includes("indicf5") && !url.includes("127.0.0.1:8001"));
    return {
      ok: false,
      status: 502,
      text: async () => JSON.stringify({ error: { message: "OpenRouter upstream error" } }),
    };
  };

  try {
    await assert.rejects(
      async () => {
        await provider.synthesize("పరీక్షా వాక్యం", {});
      },
      {
        name: "ProviderError",
        message: /Fish Audio speech synthesis failed: OpenRouter upstream error/,
      },
    );
    assert.equal(fetchCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
