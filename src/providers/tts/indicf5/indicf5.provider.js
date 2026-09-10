import http from "node:http";
import https from "node:https";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TTSProvider } from "../interfaces/tts.provider.js";
import { ProviderError } from "../../../common/errors/ProviderError.js";

const TTS_TIMEOUT_MS = 15 * 60 * 1000;
const HEALTH_TIMEOUT_MS = 10 * 1000;
const POLL_INTERVAL_MS = 1000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TTS_OUTPUT_DIR = path.resolve(__dirname, "../../../../../../storage/tts");

async function saveTtsAudio(audio) {
  await fs.mkdir(TTS_OUTPUT_DIR, {
    recursive: true,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  const filename = `platform-tts-${timestamp}-${Date.now()}.wav`;
  const outputPath = path.join(TTS_OUTPUT_DIR, filename);

  await fs.writeFile(outputPath, audio);

  return {
    outputPath,
    filename,
  };
}

function requestJson(url, method, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === "https:" ? https : http;

    const body = payload ? JSON.stringify(payload) : null;

    const headers = {};

    if (body) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(body);
    }

    const request = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method,
        headers,
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => {
          chunks.push(chunk);
        });

        response.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const text = buffer.toString("utf8");

          let parsed = null;

          try {
            parsed = text ? JSON.parse(text) : null;
          } catch {
            parsed = null;
          }

          resolve({
            statusCode: response.statusCode || 500,
            headers: response.headers,
            body: buffer,
            data: parsed,
          });
        });

        response.on("error", reject);
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("IndicF5 request timed out."));
    });

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

function getTtsAudio(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === "https:" ? https : http;

    const request = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: "GET",
        headers: {
          Accept: "audio/wav",
        },
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => {
          chunks.push(chunk);
        });

        response.on("end", () => {
          resolve({
            statusCode: response.statusCode || 500,
            headers: response.headers,
            body: Buffer.concat(chunks),
          });
        });

        response.on("error", reject);
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("IndicF5 request timed out."));
    });

    request.on("error", reject);
    request.end();
  });
}

function getTtsHealth(url, timeoutMs) {
  return requestJson(url, "GET", null, timeoutMs);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class IndicF5Provider extends TTSProvider {
  constructor({ getPlatformConfigUseCase }) {
    super();

    this.getPlatformConfigUseCase = getPlatformConfigUseCase;
  }

  get name() {
    return "indicf5";
  }

  async getConfig() {
    const baseUrl =
      await this.getPlatformConfigUseCase.getValue("INDICF5_BASE_URL");

    return {
      baseUrl: (baseUrl || "http://127.0.0.1:8001").replace(/\/+$/, ""),
    };
  }

  async calibrateVoice(options = {}) {
    const config = await this.getConfig();
    let targetBaseUrl = config.baseUrl;

    const payload = {
      reference_audio_base64:
        options.referenceAudioBase64 || options.reference_audio_base64,
      reference_text: options.referenceText || options.reference_text,
      ...(options.customVoiceId || options.custom_voice_id
        ? { custom_voice_id: options.customVoiceId || options.custom_voice_id }
        : {}),
    };

    console.log("[IndicF5] Calibrating voice clone...", {
      baseUrl: targetBaseUrl,
      customVoiceId: payload.custom_voice_id,
      textLength: payload.reference_text?.length,
    });

    let result = null;
    try {
      result = await requestJson(
        `${targetBaseUrl}/tts/clone`,
        "POST",
        payload,
        30 * 1000,
      );
    } catch (err) {
      console.warn(
        `[IndicF5] Calibrate request to ${targetBaseUrl} failed: ${err.message}`,
      );
      result = { statusCode: 502, data: { detail: err.message } };
    }

    if (
      (!result || result.statusCode < 200 || result.statusCode >= 300) &&
      targetBaseUrl !== "http://127.0.0.1:8001"
    ) {
      const localFallback = (
        process.env.INDICF5_BASE_URL || "http://127.0.0.1:8001"
      ).replace(/\/+$/, "");
      try {
        const fallbackResult = await requestJson(
          `${localFallback}/tts/clone`,
          "POST",
          payload,
          30 * 1000,
        );

        if (
          fallbackResult.statusCode >= 200 &&
          fallbackResult.statusCode < 300
        ) {
          result = fallbackResult;
          targetBaseUrl = localFallback;
          console.log("[IndicF5] Local fallback for calibrate succeeded", {
            baseUrl: targetBaseUrl,
            data: fallbackResult.data,
          });
        }
      } catch (fbErr) {
        console.warn(
          "[IndicF5] Local fallback calibrate error:",
          fbErr.message,
        );
      }
    }

    if (!result || result.statusCode < 200 || result.statusCode >= 300) {
      throw new ProviderError(
        result?.data?.detail ||
          result?.data?.message ||
          "Voice clone calibration failed.",
      );
    }

    return result.data;
  }

  async synthesize(text, options = {}) {
    if (!text?.trim()) {
      throw new ProviderError("Text is required.");
    }

    const startedAt = Date.now();

    try {
      const config = await this.getConfig();
      let targetBaseUrl = config.baseUrl;

      const voiceMode =
        options.voiceMode ||
        options.voice_mode ||
        (options.referenceAudioBase64 || options.reference_audio_base64
          ? "custom_clone"
          : "preset");
      const presetVoice = options.presetVoice || options.preset_voice || null;
      const customVoiceId =
        options.customVoiceId || options.custom_voice_id || null;

      const payload = {
        text: text.trim(),
        voice_mode: voiceMode,
        ...(presetVoice ? { preset_voice: presetVoice } : {}),
        ...(customVoiceId ? { custom_voice_id: customVoiceId } : {}),
        ...(options.referenceAudioBase64 || options.reference_audio_base64
          ? {
              reference_audio_base64:
                options.referenceAudioBase64 || options.reference_audio_base64,
            }
          : {}),
        ...(options.referenceText || options.reference_text
          ? { reference_text: options.referenceText || options.reference_text }
          : {}),
        ...(options.speed ? { speed: Number(options.speed) } : {}),
        ...(options.speakingStyle || options.speaking_style
          ? { speaking_style: options.speakingStyle || options.speaking_style }
          : {}),
        ...(options.steps ? { steps: Number(options.steps) } : {}),
        ...(options.debug !== undefined
          ? { debug: Boolean(options.debug) }
          : {}),
      };

      console.log("[IndicF5] create job", {
        baseUrl: targetBaseUrl,
        voiceMode,
        presetVoice,
        customVoiceId,
        payloadTextLen: payload.text.length,
      });

      let createResult = null;
      try {
        createResult = await requestJson(
          `${targetBaseUrl}/tts/jobs`,
          "POST",
          payload,
          30 * 1000,
        );
      } catch (reqErr) {
        console.warn(
          `[IndicF5] Target URL ${targetBaseUrl} request failed: ${reqErr.message}`,
        );
        createResult = { statusCode: 502, data: { detail: reqErr.message } };
      }

      if (
        (!createResult ||
          createResult.statusCode < 200 ||
          createResult.statusCode >= 300) &&
        targetBaseUrl !== "http://127.0.0.1:8001"
      ) {
        const localFallback = (
          process.env.INDICF5_BASE_URL || "http://127.0.0.1:8001"
        ).replace(/\/+$/, "");
        console.warn(
          `[IndicF5] Target URL ${targetBaseUrl} failed with status ${createResult?.statusCode}. Attempting local fallback to ${localFallback}...`,
        );

        try {
          const fallbackResult = await requestJson(
            `${localFallback}/tts/jobs`,
            "POST",
            payload,
            10 * 1000,
          );

          if (
            fallbackResult.statusCode >= 200 &&
            fallbackResult.statusCode < 300
          ) {
            createResult = fallbackResult;
            targetBaseUrl = localFallback;
            console.log("[IndicF5] Local fallback succeeded", {
              baseUrl: targetBaseUrl,
              data: fallbackResult.data,
            });
          }
        } catch (fbErr) {
          console.warn(
            "[IndicF5] Local fallback request error:",
            fbErr.message,
          );
        }
      }

      if (
        !createResult ||
        createResult.statusCode < 200 ||
        createResult.statusCode >= 300
      ) {
        const detail =
          createResult?.data?.detail ||
          `IndicF5 job creation failed with status ${createResult?.statusCode || 500}.`;

        throw new ProviderError(detail);
      }

      const jobId = createResult.data?.id;

      if (!jobId) {
        throw new ProviderError("IndicF5 did not return a job ID.");
      }

      console.log("[IndicF5] job created", { jobId, baseUrl: targetBaseUrl });

      let completedJobData = null;

      while (true) {
        if (Date.now() - startedAt >= TTS_TIMEOUT_MS) {
          throw new ProviderError(
            "IndicF5 TTS generation timed out after 15 minutes.",
          );
        }

        const jobResult = await requestJson(
          `${targetBaseUrl}/tts/jobs/${jobId}`,
          "GET",
          null,
          10 * 1000,
        );

        console.log("[IndicF5] job status", {
          jobId,
          statusCode: jobResult.statusCode,
          data: jobResult.data,
        });

        if (jobResult.statusCode < 200 || jobResult.statusCode >= 300) {
          const detail =
            jobResult.data?.detail ||
            `IndicF5 job status failed with status ${jobResult.statusCode}.`;

          throw new ProviderError(detail);
        }

        const job = jobResult.data;

        if (job?.status === "failed") {
          throw new ProviderError(
            job.errorMessage || "IndicF5 TTS generation failed.",
          );
        }

        if (job?.status === "completed") {
          console.log("[IndicF5] job completed, downloading audio", jobId);
          completedJobData = job;
          break;
        }

        await sleep(POLL_INTERVAL_MS);
      }

      console.log(
        "[IndicF5] requesting audio",
        `${targetBaseUrl}/tts/jobs/${jobId}/audio`,
      );

      const audioResult = await getTtsAudio(
        `${targetBaseUrl}/tts/jobs/${jobId}/audio`,
        30 * 1000,
      );

      console.log("[IndicF5] audio response", {
        statusCode: audioResult.statusCode,
        bytes: audioResult.body.length,
        contentType: audioResult.headers["content-type"],
      });

      if (audioResult.statusCode < 200 || audioResult.statusCode >= 300) {
        let detail = `IndicF5 audio download failed with status ${audioResult.statusCode}.`;

        try {
          const body = JSON.parse(audioResult.body.toString("utf8"));

          if (body?.detail) {
            detail = body.detail;
          }
        } catch {
          // Ignore non-JSON response.
        }

        throw new ProviderError(detail);
      }

      if (!audioResult.body.length) {
        throw new ProviderError("IndicF5 returned an empty audio response.");
      }

      const savedAudio = await saveTtsAudio(audioResult.body);

      return {
        audio: audioResult.body,
        outputPath: savedAudio.outputPath,
        filename: savedAudio.filename,
        contentType: audioResult.headers["content-type"] || "audio/wav",
        telemetry: completedJobData?.telemetry,
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      if (error?.message === "IndicF5 request timed out.") {
        throw new ProviderError(
          "IndicF5 TTS generation timed out after 15 minutes.",
          {
            cause: error,
          },
        );
      }

      throw new ProviderError("Unable to connect to IndicF5 TTS server.", {
        cause: error,
      });
    }
  }

  async health() {
    try {
      const config = await this.getConfig();
      const baseUrl = config.baseUrl;

      let result = null;
      try {
        result = await getTtsHealth(`${baseUrl}/health`, HEALTH_TIMEOUT_MS);
      } catch {
        result = null;
      }

      if (
        (!result || result.statusCode < 200 || result.statusCode >= 300) &&
        baseUrl !== "http://127.0.0.1:8001"
      ) {
        const localFallback = (
          process.env.INDICF5_BASE_URL || "http://127.0.0.1:8001"
        ).replace(/\/+$/, "");
        try {
          result = await getTtsHealth(
            `${localFallback}/health`,
            HEALTH_TIMEOUT_MS,
          );
        } catch {
          result = null;
        }
      }

      if (!result || result.statusCode < 200 || result.statusCode >= 300) {
        return false;
      }

      return result.data;
    } catch {
      return false;
    }
  }
}
