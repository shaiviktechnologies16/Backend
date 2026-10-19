import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TTSProvider } from "../interfaces/tts.provider.js";
import { ProviderError } from "../../../common/errors/ProviderError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store generated audio in project storage or host storage
const PRIMARY_OUTPUT_DIR = path.resolve(__dirname, "../../../../../../storage/tts");
const FALLBACK_OUTPUT_DIR = path.resolve(process.cwd(), "storage/tts");

const DEFAULT_MODEL = "fish-audio/s2.1-pro-free:free";
const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024; // 15MB max for audio reference

const SUPPORTED_AUDIO_EXTENSIONS = [
  "wav",
  "mp3",
  "m4a",
  "flac",
  "ogg",
  "webm",
  "aac",
];

const MIME_BY_EXTENSION = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  flac: "audio/flac",
  ogg: "audio/ogg",
  webm: "audio/webm",
  aac: "audio/aac",
};

/**
 * Detect MIME type from audio buffer magic bytes.
 */
export function detectAudioMimeFromBuffer(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // WAV: "RIFF....WAVE"
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WAVE"
  ) {
    return "audio/wav";
  }

  // FLAC: "fLaC"
  if (buffer.toString("ascii", 0, 4) === "fLaC") {
    return "audio/flac";
  }

  // OGG: "OggS"
  if (buffer.toString("ascii", 0, 4) === "OggS") {
    return "audio/ogg";
  }

  // MP3: "ID3" or sync word 0xFF 0xFB / 0xFA / 0xF3 / 0xF2
  if (buffer.toString("ascii", 0, 3) === "ID3") {
    return "audio/mpeg";
  }
  if (
    buffer[0] === 0xff &&
    (buffer[1] & 0xe0) === 0xe0 &&
    (buffer[1] & 0x06) !== 0
  ) {
    return "audio/mpeg";
  }

  // MP4 / M4A / AAC in ISO BMFF: "ftyp" at index 4
  if (buffer.toString("ascii", 4, 8) === "ftyp") {
    return "audio/mp4";
  }

  // WebM: 0x1A 0x45 0xDF 0xA3
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return "audio/webm";
  }

  // AAC ADTS: 0xFF 0xF1 or 0xFF 0xF9
  if (buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0) {
    return "audio/aac";
  }

  return null;
}

/**
 * Estimates audio duration in seconds from buffer headers (metadata only).
 */
export function estimateAudioDuration(buffer, mimeType) {
  if (!buffer || buffer.length === 0) return null;
  // WAV: 44-byte header, read sample rate and byte rate
  if (
    buffer.length > 44 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WAVE"
  ) {
    const byteRate = buffer.readUInt32LE(28);
    if (byteRate > 0) {
      return (buffer.length - 44) / byteRate;
    }
  }
  // MP3: rough estimate assuming standard 128 kbps
  if (mimeType === "audio/mpeg") {
    return buffer.length / (128 * 1024 / 8);
  }
  return null;
}

export const REFERENCE_TEXT = `హాయ్ ఫ్రెండ్స్!

మన జీవితంలో చిన్న చిన్న మార్పులే… పెద్ద విజయాలకు కారణం అవుతాయి.

ప్రతిరోజూ ఒక కొత్త విషయం నేర్చుకోండి.
మీ లక్ష్యంపై ఫోకస్ పెట్టండి.
ఆగకుండా ముందుకు సాగండి.

ఎందుకంటే… మీ కలను నిజం చేసేది ఇంకెవరో కాదు — మీరే!`;

/**
 * Normalizes and validates Base64 reference audio into a valid data URI.
 */
export function normalizeReferenceAudio(referenceAudioBase64) {
  if (!referenceAudioBase64 || typeof referenceAudioBase64 !== "string") {
    return null;
  }

  let rawBase64 = referenceAudioBase64.trim();
  let mimeType = null;

  if (rawBase64.startsWith("data:")) {
    const commaIndex = rawBase64.indexOf(",");
    if (commaIndex !== -1) {
      const header = rawBase64.slice(5, commaIndex);
      const mimeMatch = header.match(/^([^;]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1].toLowerCase();
      }
      rawBase64 = rawBase64.slice(commaIndex + 1);
    }
  }

  // Strip whitespaces or newlines
  rawBase64 = rawBase64.replace(/\s+/g, "");

  const buffer = Buffer.from(rawBase64, "base64");
  if (!buffer || buffer.length === 0) {
    throw new ProviderError("Reference audio buffer is empty.");
  }

  if (buffer.length > MAX_AUDIO_SIZE_BYTES) {
    throw new ProviderError(
      `Reference audio exceeds maximum size limit of 15 MB (received ${(
        buffer.length /
        (1024 * 1024)
      ).toFixed(2)} MB).`,
      { statusCode: 413, errorCode: "PAYLOAD_TOO_LARGE" },
    );
  }

  // Detect mime type from magic bytes if not provided or generic
  const detectedMime = detectAudioMimeFromBuffer(buffer);
  if (detectedMime) {
    mimeType = detectedMime;
  } else if (
    mimeType &&
    (mimeType.startsWith("audio/") ||
      mimeType === "video/webm" ||
      mimeType === "video/ogg")
  ) {
    // Keep specified valid audio mime
  } else {
    throw new ProviderError(
      "Invalid audio format: reference file does not contain recognized audio data.",
    );
  }

  return `data:${mimeType};base64,${rawBase64}`;
}

async function saveFishAudio(audioBuffer, format = "mp3") {
  let targetDir = PRIMARY_OUTPUT_DIR;
  try {
    await fs.mkdir(targetDir, { recursive: true });
  } catch {
    targetDir = FALLBACK_OUTPUT_DIR;
    await fs.mkdir(targetDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const ext = format === "wav" ? "wav" : "mp3";
  const filename = `platform-tts-fish-${timestamp}-${Date.now()}.${ext}`;
  const outputPath = path.join(targetDir, filename);

  await fs.writeFile(outputPath, audioBuffer);

  return {
    outputPath,
    filename,
  };
}

/**
 * Resolves the reference audio and transcript in priority order:
 * 1. If user uploaded reference audio, use that exact uploaded file.
 * 2. If user did not upload, use Backend/local-tts/reference.wav (resolved relative to backend project root)
 *    and exact REFERENCE_TEXT.
 * 3. If neither exists or cannot be read, throws a clear ProviderError.
 */
export async function resolveFishAudioReference(options = {}) {
  // If explicitly requested unconditioned (for controlled comparison baseline), return null
  if (options.unconditioned === true) {
    return null;
  }

  const isCloningRequested = Boolean(
    options.referenceAudioBase64 !== undefined ||
    options.reference_audio_base64 !== undefined ||
    options.referenceAudio !== undefined
  );

  const uploadedAudio =
    options.referenceAudioBase64 ||
    options.reference_audio_base64 ||
    options.referenceAudio;

  const uploadedTranscript =
    options.referenceText || options.reference_text || null;

  // 1. If the user explicitly requested custom voice cloning:
  if (isCloningRequested) {
    if (!uploadedAudio || typeof uploadedAudio !== "string" || !uploadedAudio.trim()) {
      throw new ProviderError(
        "Reference audio payload cannot be empty when custom voice cloning is requested.",
        { statusCode: 400, errorCode: "INVALID_REFERENCE_AUDIO" }
      );
    }

    const dataUri = normalizeReferenceAudio(uploadedAudio);
    const cleanBase64 = uploadedAudio
      .replace(/^data:[^;]+;base64,/, "")
      .replace(/\s+/g, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const mimeType = detectAudioMimeFromBuffer(buffer) || "audio/wav";

    // Use transcript provided for that upload if available; do not falsely associate an unrelated transcript
    const transcript =
      uploadedTranscript &&
      typeof uploadedTranscript === "string" &&
      uploadedTranscript.trim()
        ? uploadedTranscript.trim()
        : null;

    const durationSec = estimateAudioDuration(buffer, mimeType);

    return {
      source: "uploaded",
      dataUri,
      buffer,
      byteLength: buffer.length,
      mimeType,
      transcript,
      durationSec,
    };
  }

  // 2. If the user did not upload a reference file, use: Backend/local-tts/reference.wav
  // Resolve local-tts/reference.wav relative to the backend project directory,
  // not relative to process.cwd(), because the process may start from a different working directory.
  const backendRoot = path.resolve(__dirname, "../../../..");
  const localDefaultPath =
    process.env.FISH_AUDIO_DEFAULT_REFERENCE_PATH ||
    path.join(backendRoot, "local-tts/reference.wav");

  let localBuffer;
  try {
    const stat = await fs.stat(localDefaultPath);
    if (!stat.isFile() || stat.size === 0) {
      throw new Error(
        `File is empty or not a regular file: ${localDefaultPath}`,
      );
    }
    localBuffer = await fs.readFile(localDefaultPath);
  } catch (err) {
    // 3. If neither exists, return a clear error explaining that reference audio is required for custom voice cloning.
    throw new ProviderError(
      `Reference audio is required for custom voice cloning. No uploaded reference audio was provided and local reference audio could not be read at ${localDefaultPath}: ${err.message}`,
    );
  }

  // Verify that the file exists, can be read, and contains valid audio.
  const detectedMime = detectAudioMimeFromBuffer(localBuffer);
  if (!detectedMime) {
    throw new ProviderError(
      `Local reference audio at ${localDefaultPath} does not contain recognized valid audio bytes.`,
    );
  }

  const base64Data = localBuffer.toString("base64");
  const dataUri = `data:${detectedMime};base64,${base64Data}`;

  const durationSec = estimateAudioDuration(localBuffer, detectedMime);

  // REQUIREMENT 2: Use the exact REFERENCE_TEXT defined above whenever the local fallback reference.wav is used.
  return {
    source: "local_fallback",
    filePath: localDefaultPath,
    dataUri,
    buffer: localBuffer,
    byteLength: localBuffer.length,
    mimeType: detectedMime,
    transcript: REFERENCE_TEXT,
    durationSec,
  };
}

export class FishAudioProvider extends TTSProvider {
  constructor({ getPlatformConfigUseCase } = {}) {
    super();
    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
  }

  get name() {
    return "fish_audio";
  }

  async resolveSpeechUrl() {
    // Zero hardcoded URLs in code: loaded exclusively from environment variables or platform settings
    const envUrl =
      process.env.FISH_AUDIO_API_URL ||
      process.env.OPENROUTER_SPEECH_URL ||
      process.env.TTS_API_URL ||
      process.env.HUGGINGFACE_TTS_URL;

    if (envUrl && envUrl.trim()) {
      return envUrl.trim();
    }

    if (this.getPlatformConfigUseCase) {
      try {
        const configUrl =
          (await this.getPlatformConfigUseCase.getValue("FISH_AUDIO_API_URL")) ||
          (await this.getPlatformConfigUseCase.getValue("OPENROUTER_SPEECH_URL")) ||
          (await this.getPlatformConfigUseCase.getValue("TTS_API_URL"));
        if (configUrl && configUrl.trim()) {
          return configUrl.trim();
        }
      } catch {
        // Fallback silently if platform config is unreachable
      }
    }

    throw new ProviderError(
      "TTS API URL is not configured. Please define FISH_AUDIO_API_URL or OPENROUTER_SPEECH_URL in your .env file.",
    );
  }

  async resolveApiKey(speechUrl) {
    const url = speechUrl || "";
    const isHuggingFaceTarget =
      url.includes("huggingface.co") || url.includes("hf.space");

    // 1. Check Hugging-Face-TTS key token from .env
    const hfKey =
      process.env["Hugging-Face-TTS"] ||
      process.env.HUGGING_FACE_TTS ||
      process.env.HF_TTS_TOKEN ||
      process.env.HF_TOKEN;

    if (isHuggingFaceTarget && hfKey && hfKey.trim()) {
      return hfKey.trim();
    }

    // 2. Check OpenRouter / Fish Audio environment variables
    const openrouterKey =
      process.env.OPENROUTER_API_KEY ||
      process.env.FISH_AUDIO_API_KEY ||
      process.env.FISH_API_KEY;

    if (openrouterKey && openrouterKey.trim()) {
      return openrouterKey.trim();
    }

    // 3. Fallback to Hugging Face token if OpenRouter key is not set
    if (hfKey && hfKey.trim()) {
      return hfKey.trim();
    }

    // 4. Check platform config if available
    if (this.getPlatformConfigUseCase) {
      try {
        const configKey =
          (await this.getPlatformConfigUseCase.getValue("OPENROUTER_API_KEY")) ||
          (await this.getPlatformConfigUseCase.getValue("FISH_AUDIO_API_KEY")) ||
          (await this.getPlatformConfigUseCase.getValue("HUGGING_FACE_TTS")) ||
          (await this.getPlatformConfigUseCase.getValue("HUGGINGFACE_TTS_TOKEN"));

        if (configKey && configKey.trim()) {
          return configKey.trim();
        }
      } catch {
        // Fallback silently if platform config is unreachable
      }
    }

    return null;
  }

  async resolveModel() {
    if (process.env.FISH_AUDIO_MODEL?.trim()) {
      return process.env.FISH_AUDIO_MODEL.trim();
    }

    if (this.getPlatformConfigUseCase) {
      try {
        const configModel =
          await this.getPlatformConfigUseCase.getValue("FISH_AUDIO_MODEL");
        if (configModel && configModel.trim()) {
          return configModel.trim();
        }
      } catch {
        // Fallback
      }
    }

    return DEFAULT_MODEL;
  }

  async calibrateVoice(options = {}) {
    const refInfo = await resolveFishAudioReference(options);
    const customVoiceId =
      options.customVoiceId ||
      options.custom_voice_id ||
      `fish_clone_${Date.now()}`;

    console.log("[FishAudio] Calibrated voice clone reference:", {
      provider: this.name,
      customVoiceId,
      referenceSource: refInfo.source,
      referenceByteLength: refInfo.byteLength,
      mimeType: refInfo.mimeType,
      hasTranscript: Boolean(refInfo.transcript),
    });

    return {
      customVoiceId,
      status: "READY",
      referenceSource: refInfo.source,
      audioSizeBytes: refInfo.byteLength,
      mimeType: refInfo.mimeType,
      hasTranscript: Boolean(refInfo.transcript),
      stateless: true,
      message:
        refInfo.source === "uploaded"
          ? "Uploaded reference audio validated for Fish Audio voice cloning."
          : "Local default reference audio (reference.wav) loaded for Fish Audio voice cloning.",
    };
  }

  async synthesize(text, options = {}) {
    if (!text || typeof text !== "string" || !text.trim()) {
      throw new ProviderError("Text is required for speech synthesis.");
    }

    const speechUrl = await this.resolveSpeechUrl();
    const apiKey = await this.resolveApiKey(speechUrl);
    if (!apiKey) {
      throw new ProviderError(
        "TTS API key is not configured. Please define Hugging-Face-TTS or OPENROUTER_API_KEY in your .env file.",
      );
    }

    const model = options.model || (await this.resolveModel());

    // Resolve reference audio according to strict priority order:
    // 1. Uploaded reference audio
    // 2. Backend/local-tts/reference.wav fallback
    // 3. Clear error if neither exists
    const refInfo = await resolveFishAudioReference(options);

    const inputReferences = [];
    if (refInfo) {
      inputReferences.push({
        type: "input_audio",
        input_audio: {
          data: refInfo.dataUri,
        },
      });

      if (
        refInfo.transcript &&
        typeof refInfo.transcript === "string" &&
        refInfo.transcript.trim()
      ) {
        inputReferences.push({
          type: "text",
          text: refInfo.transcript.trim(),
        });
      }
    }

    const cleanText = text.normalize("NFC").trim();
    const isHuggingFace =
      speechUrl.includes("huggingface.co") || speechUrl.includes("hf.space");
    const isFishAudioNative = speechUrl.includes("api.fish.audio");

    const siteUrl =
      process.env.OPENROUTER_SITE_URL ||
      process.env.FRONTEND_URL ||
      process.env.SITE_URL ||
      "";

    let payload;
    const requestHeaders = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(siteUrl ? { "HTTP-Referer": siteUrl } : {}),
      "X-Title": process.env.PLATFORM_NAME || "Shaivik AI TTS",
    };

    if (isHuggingFace) {
      payload = { inputs: cleanText };
    } else if (isFishAudioNative) {
      // Native Fish Audio REST API (https://api.fish.audio/v1/tts)
      payload = {
        text: cleanText,
        format: options.format === "wav" ? "wav" : "mp3",
        ...(options.speed ? { prosody: { speed: Number(options.speed) } } : {}),
      };
      requestHeaders.model = model
        .replace(/^fish-audio\//, "")
        .replace(/:free$/, "");
    } else {
      // OpenRouter Audio Speech API (https://openrouter.ai/api/v1/audio/speech)
      // OpenRouter strictly requires response_format to be "mp3" or "pcm"
      // NEVER pass `voice` parameter for Fish Audio (causes 400 Bad Request)
      payload = {
        model,
        input: cleanText,
        response_format: "mp3",
        ...(options.speed
          ? {
              speed: Math.max(0.25, Math.min(4.0, Number(options.speed))),
            }
          : {}),
        ...(inputReferences.length > 0 ? { input_references: inputReferences } : {}),
      };
    }

    // Safe diagnostic logging
    console.log("[FishAudio] Synthesizing speech...", {
      provider: this.name,
      model: isHuggingFace ? "huggingface" : model,
      speechUrl,
      textLength: cleanText.length,
      referenceSource: refInfo ? refInfo.source : "none_unconditioned",
      referenceMimeType: refInfo ? refInfo.mimeType : null,
      referenceByteLength: refInfo ? refInfo.byteLength : 0,
      referenceDurationSec: refInfo ? refInfo.durationSec : null,
      referenceAudioDecoded: Boolean(refInfo?.buffer && refInfo.buffer.length > 0),
      hasReferenceTranscript: Boolean(refInfo?.transcript),
      inputReferencesIncluded: inputReferences.length > 0,
    });

    // REQUIREMENT 2: Inspect actual outgoing JSON before transmission, with Base64 removed
    const sanitizedOutgoingPayload = {
      model: payload.model,
      input: payload.input,
      response_format: payload.response_format,
      ...(payload.speed ? { speed: payload.speed } : {}),
      ...(payload.input_references
        ? {
            input_references: payload.input_references.map((ref) => {
              if (ref.type === "input_audio") {
                return {
                  type: "input_audio",
                  input_audio: {
                    data: `data:${refInfo?.mimeType || "audio/wav"};base64,<${refInfo?.byteLength || 0} bytes binary audio>`,
                  },
                };
              }
              return ref;
            }),
          }
        : {}),
    };

    console.log(
      "[FishAudio] Outgoing OpenRouter Request Payload (sanitized):\n",
      JSON.stringify(sanitizedOutgoingPayload, null, 2),
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60 * 1000);

    let response;
    try {
      response = await fetch(speechUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new ProviderError(
          "TTS speech synthesis timed out after 60 seconds.",
        );
      }
      throw new ProviderError(
        `Failed to reach TTS service at ${speechUrl}: ${err.message || err}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      let errorMessage = `Provider error (status ${response.status})`;
      try {
        const errorText = await response.text();
        const parsed = JSON.parse(errorText);
        if (parsed?.error?.message) {
          errorMessage = parsed.error.message;
        } else if (parsed?.message) {
          errorMessage = parsed.message;
        } else if (errorText) {
          errorMessage = errorText.slice(0, 300);
        }
      } catch {
        // Keep status text
      }

      console.error("[FishAudio] OpenRouter error response:", {
        provider: this.name,
        model,
        status: response.status,
        error: errorMessage,
      });

      throw new ProviderError(
        `Fish Audio speech synthesis failed: ${errorMessage}`,
        { statusCode: response.status },
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new ProviderError("Received empty audio from Fish Audio provider.");
    }

    const detectedMime = detectAudioMimeFromBuffer(audioBuffer);
    const contentType =
      response.headers.get("content-type") ||
      detectedMime ||
      "audio/mpeg";

    const actualFormat =
      detectedMime === "audio/wav" || contentType.includes("wav")
        ? "wav"
        : "mp3";

    const savedAudio = await saveFishAudio(audioBuffer, actualFormat);

    console.log("[FishAudio] OpenRouter response:", {
      provider: this.name,
      model,
      status: response.status,
      statusText: response.statusText,
      format: actualFormat,
      audioBytes: audioBuffer.length,
      filename: savedAudio.filename,
    });

    return {
      audio: audioBuffer,
      outputPath: savedAudio.outputPath,
      filename: savedAudio.filename,
      contentType,
      format: actualFormat,
      referenceSource: refInfo ? refInfo.source : "unconditioned",
    };
  }

  async health() {
    try {
      const apiKey = await this.resolveApiKey();
      const model = await this.resolveModel();
      return {
        status: apiKey ? "ok" : "missing_api_key",
        provider: "fish_audio",
        model,
        hasApiKey: Boolean(apiKey),
      };
    } catch (err) {
      return {
        status: "error",
        provider: "fish_audio",
        error: err.message,
      };
    }
  }
}

