import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { FishAudioProvider, resolveFishAudioReference, normalizeReferenceAudio } from "../../providers/tts/fish-audio/fish-audio.provider.js";
import { createPublicTtsController } from "./controller/public-tts.controller.js";
import { TtsDemoGuardService } from "./service/tts-demo-guard.service.js";

describe("Voice Studio Voice Cloning End-to-End Tests", () => {
  // 1. Text-only requests use default studio voice
  it("resolves default studio reference when no custom audio is provided", async () => {
    const ref = await resolveFishAudioReference({});
    assert.ok(ref, "Should return reference info");
    assert.equal(ref.source, "local_fallback");
    assert.ok(ref.dataUri.startsWith("data:audio/wav;base64,"));
    assert.ok(ref.transcript.includes("హాయ్ ఫ్రెండ్స్!"));
  });

  // 2. Uploaded reference audio is prioritized and tagged as uploaded
  it("resolves uploaded reference audio when valid audio base64 is provided", async () => {
    // Generate valid 100-sample 16kHz WAV header + silence
    const wavHeader = Buffer.alloc(44);
    wavHeader.write("RIFF", 0);
    wavHeader.writeUInt32LE(36 + 200, 4);
    wavHeader.write("WAVE", 8);
    wavHeader.write("fmt ", 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20); // PCM
    wavHeader.writeUInt16LE(1, 22); // Mono
    wavHeader.writeUInt32LE(16000, 24); // Sample rate
    wavHeader.writeUInt32LE(32000, 28); // Byte rate
    wavHeader.writeUInt16LE(2, 32); // Block align
    wavHeader.writeUInt16LE(16, 34); // Bits per sample
    wavHeader.write("data", 36);
    wavHeader.writeUInt32LE(200, 40);

    const fullWav = Buffer.concat([wavHeader, Buffer.alloc(200)]);
    const base64Wav = `data:audio/wav;base64,${fullWav.toString("base64")}`;

    const ref = await resolveFishAudioReference({
      referenceAudioBase64: base64Wav,
      referenceText: "Test voice transcript for phoneme alignment.",
    });

    assert.ok(ref, "Should return reference info");
    assert.equal(ref.source, "uploaded");
    assert.equal(ref.transcript, "Test voice transcript for phoneme alignment.");
    assert.ok(ref.dataUri.startsWith("data:audio/wav;base64,"));
  });

  // 3. Strict failure: Voice cloning requests NEVER silently fall back to default voice
  it("throws explicit error when cloning is requested with empty audio", async () => {
    await assert.rejects(
      async () => {
        await resolveFishAudioReference({
          referenceAudioBase64: "   ",
        });
      },
      (err) => {
        assert.equal(err.name, "ProviderError");
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes("Reference audio payload cannot be empty"));
        return true;
      }
    );
  });

  it("throws explicit error when cloning is requested with non-audio content", async () => {
    const textBuffer = Buffer.from("THIS IS NOT AN AUDIO FILE AND HAS NO AUDIO HEADER");
    const badBase64 = `data:text/plain;base64,${textBuffer.toString("base64")}`;

    await assert.rejects(
      async () => {
        await resolveFishAudioReference({
          referenceAudioBase64: badBase64,
        });
      },
      (err) => {
        assert.equal(err.name, "ProviderError");
        assert.ok(err.message.includes("Invalid audio format"));
        return true;
      }
    );
  });

  // 4. Provider constructs exact OpenRouter payload with input_references
  it("constructs input_references with audio and transcript for OpenRouter", async () => {
    let capturedPayload = null;

    // Mock global fetch to intercept OpenRouter call
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async (url, init) => {
      capturedPayload = JSON.parse(init.body);
      const fakeAudioResponse = Buffer.from("ID3FakeMp3AudioDataForTestingMock");
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "audio/mpeg" }),
        arrayBuffer: async () => fakeAudioResponse.buffer.slice(fakeAudioResponse.byteOffset, fakeAudioResponse.byteOffset + fakeAudioResponse.byteLength),
      };
    });

    try {
      const provider = new FishAudioProvider();
      // Set test API key and URL in environment
      process.env.OPENROUTER_API_KEY = "test-sk-or-mock";
      process.env.OPENROUTER_SPEECH_URL = "https://openrouter.ai/api/v1/audio/speech";

      const wavHeader = Buffer.alloc(44);
      wavHeader.write("RIFF", 0);
      wavHeader.writeUInt32LE(36 + 100, 4);
      wavHeader.write("WAVE", 8);
      wavHeader.write("fmt ", 12);
      wavHeader.writeUInt32LE(16, 16);
      wavHeader.writeUInt16LE(1, 20);
      wavHeader.writeUInt16LE(1, 22);
      wavHeader.writeUInt32LE(16000, 24);
      wavHeader.writeUInt32LE(32000, 28);
      wavHeader.writeUInt16LE(2, 32);
      wavHeader.writeUInt16LE(16, 34);
      wavHeader.write("data", 36);
      wavHeader.writeUInt32LE(100, 40);

      const testAudio = Buffer.concat([wavHeader, Buffer.alloc(100)]);
      const base64Audio = `data:audio/wav;base64,${testAudio.toString("base64")}`;

      const res = await provider.synthesize("Synthesize this test speech.", {
        speed: 1.2,
        referenceAudioBase64: base64Audio,
        referenceText: "Hello, this is the speaker speaking.",
      });

      assert.equal(res.referenceSource, "uploaded");
      assert.ok(capturedPayload, "Upstream payload must be captured");
      assert.equal(capturedPayload.model, "fish-audio/s2.1-pro-free:free");
      assert.equal(capturedPayload.input, "Synthesize this test speech.");
      assert.equal(capturedPayload.speed, 1.2);
      assert.equal(capturedPayload.response_format, "mp3");
      assert.ok(Array.isArray(capturedPayload.input_references), "input_references must be an array");
      assert.equal(capturedPayload.input_references.length, 2);

      assert.equal(capturedPayload.input_references[0].type, "input_audio");
      assert.ok(capturedPayload.input_references[0].input_audio.data.startsWith("data:audio/wav;base64,"));

      assert.equal(capturedPayload.input_references[1].type, "text");
      assert.equal(capturedPayload.input_references[1].text, "Hello, this is the speaker speaking.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 5. Controller returns x-voice-source header for client distinction
  it("public TTS controller sets x-voice-source header correctly", async () => {
    const mockGuard = new TtsDemoGuardService({ visitorLimit: 5, globalLimit: 40 });
    const mockUseCase = {
      execute: mock.fn(async ({ text, options }) => {
        return {
          audio: Buffer.from("audio-bytes"),
          format: "mp3",
          contentType: "audio/mpeg",
          referenceSource: options.referenceAudioBase64 ? "uploaded" : "local_fallback",
        };
      }),
    };

    const controller = createPublicTtsController({
      synthesizeSpeechUseCase: mockUseCase,
      ttsDemoGuardService: mockGuard,
    });

    const headers = {};
    const res = {
      setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
      status: () => res,
      send: (body) => body,
    };

    // Request with reference audio
    await controller.synthesize(
      {
        headers: { "x-visitor-id": "visitor-voice-test-1" },
        body: {
          text: "Hello voice cloning",
          referenceAudioBase64: "data:audio/wav;base64,AAAA",
          referenceText: "Sample transcript",
        },
      },
      res
    );

    assert.equal(headers["x-voice-source"], "uploaded");
    assert.equal(headers["content-type"], "audio/mpeg");
  });
});

