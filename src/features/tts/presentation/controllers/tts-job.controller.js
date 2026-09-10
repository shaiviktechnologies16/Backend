import http from "node:http";
import https from "node:https";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createTtsJobController({
  createTtsJobUseCase,
  getTtsJobUseCase,
  ttsJobRepository,
  ttsJobProcessor,
}) {
  return {
    async create(req, res, next) {
      try {
        const job = await createTtsJobUseCase.execute({
          userId: req.user.id,
          text: req.body.text,
          options: {
            voiceMode: req.body.voiceMode || req.body.voice_mode,
            presetVoice: req.body.presetVoice || req.body.preset_voice,
            customVoiceId: req.body.customVoiceId || req.body.custom_voice_id,
            referenceAudioBase64:
              req.body.referenceAudioBase64 || req.body.reference_audio_base64,
            referenceText: req.body.referenceText || req.body.reference_text,
            speed: req.body.speed,
            steps: req.body.steps,
            speakingStyle: req.body.speakingStyle || req.body.speaking_style,
          },
        });

        res.status(202).json(job);

        setImmediate(() => {
          ttsJobProcessor.process(job.id).catch((error) => {
            console.error(`TTS job ${job.id} failed:`, error);
          });
        });
      } catch (error) {
        next(error);
      }
    },

    async cloneVoice(req, res, next) {
      try {
        const localTtsUrl =
          process.env.INDICF5_BASE_URL || "http://127.0.0.1:8001";
        const result = await requestJson(`${localTtsUrl}/tts/clone`, {
          method: "POST",
          body: {
            reference_audio_base64:
              req.body.reference_audio_base64 || req.body.referenceAudioBase64,
            reference_text: req.body.reference_text || req.body.referenceText,
            custom_voice_id: req.body.custom_voice_id || req.body.customVoiceId,
          },
        });

        if (result.statusCode < 200 || result.statusCode >= 300) {
          return res.status(result.statusCode || 400).json({
            message:
              result.body?.detail ||
              result.body?.message ||
              "Voice clone calibration failed.",
          });
        }

        return res.json(result.body);
      } catch (error) {
        next(error);
      }
    },

    async getById(req, res, next) {
      try {
        const result = await getTtsJobUseCase.execute({
          id: req.params.id,
          userId: req.user.id,
        });

        return res.json(result);
      } catch (error) {
        next(error);
      }
    },

    async downloadAudio(req, res, next) {
      try {
        const job = await ttsJobRepository.findByIdForUser(
          req.params.id,
          req.user.id,
        );

        if (!job) {
          return res.status(404).json({
            message: "TTS job not found.",
          });
        }

        if (job.status !== "completed") {
          return res.status(409).json({
            message: "TTS audio is not ready yet.",
            status: job.status,
            progress: job.progress,
          });
        }

        if (!job.outputPath) {
          return res.status(404).json({
            message: "TTS audio file not found.",
          });
        }

        return res.download(
          job.outputPath,
          job.outputFilename || "speech.wav",
          (error) => {
            if (error && !res.headersSent) {
              next(error);
            }
          },
        );
      } catch (error) {
        next(error);
      }
    },

    async listOutputs(req, res, next) {
      try {
        const localTtsUrl =
          process.env.INDICF5_BASE_URL || "http://127.0.0.1:8001";
        const result = await fetchJson(`${localTtsUrl}/tts/outputs`);
        const files = result?.body?.files || [];
        return res.json({ files });
      } catch (error) {
        console.error("Failed to fetch local TTS outputs:", error);
        return res.json({ files: [] });
      }
    },

    async downloadOutputAudio(req, res, next) {
      try {
        const filename = path.basename(req.params.filename);
        const candidates = [
          path.resolve(process.cwd(), "local-tts/outputs", filename),
          path.resolve(process.cwd(), "local-tts/outputs/batch", filename),
          path.resolve(process.cwd(), "outputs", filename),
          path.resolve(process.cwd(), "outputs/batch", filename),
          path.resolve(process.cwd(), "Backend/local-tts/outputs", filename),
          path.resolve(
            process.cwd(),
            "Backend/local-tts/outputs/batch",
            filename,
          ),
          path.resolve(__dirname, "../../../../../local-tts/outputs", filename),
          path.resolve(
            __dirname,
            "../../../../../local-tts/outputs/batch",
            filename,
          ),
          path.resolve(process.cwd(), "storage/tts", filename),
        ];

        let targetPath = null;
        for (const candidate of candidates) {
          try {
            await fs.access(candidate);
            targetPath = candidate;
            break;
          } catch {}
        }

        if (targetPath) {
          return res.sendFile(targetPath, (err) => {
            if (err && !res.headersSent) {
              next(err);
            }
          });
        }

        const localTtsUrl =
          process.env.INDICF5_BASE_URL || "http://127.0.0.1:8001";

        return new Promise((resolve) => {
          const proxyReq = http.get(
            `${localTtsUrl}/tts/outputs/${encodeURIComponent(filename)}/audio`,
            (proxyRes) => {
              if (proxyRes.statusCode === 200) {
                res.setHeader(
                  "Content-Type",
                  proxyRes.headers["content-type"] || "audio/wav",
                );
                if (proxyRes.headers["content-length"]) {
                  res.setHeader(
                    "Content-Length",
                    proxyRes.headers["content-length"],
                  );
                }
                proxyRes.pipe(res);
                resolve();
              } else {
                res
                  .status(proxyRes.statusCode || 404)
                  .json({ message: "Audio file not found." });
                resolve();
              }
            },
          );

          proxyReq.on("error", (err) => {
            console.error("proxyReq error:", err);
            if (!res.headersSent) {
              res
                .status(404)
                .json({ message: "Audio file not found on server." });
            }
            resolve();
          });
        });
      } catch (error) {
        console.error("downloadOutputAudio error:", error);
        next(error);
      }
    },

    async deleteOutput(req, res, next) {
      try {
        const filename = path.basename(req.params.filename);
        const candidates = [
          path.resolve(process.cwd(), "local-tts/outputs", filename),
          path.resolve(process.cwd(), "Backend/local-tts/outputs", filename),
          path.resolve(__dirname, "../../../../../local-tts/outputs", filename),
          path.resolve(process.cwd(), "storage/tts", filename),
          path.resolve(process.cwd(), "Backend/storage/tts", filename),
        ];

        let deletedAny = false;
        for (const candidate of candidates) {
          try {
            await fs.unlink(candidate);
            deletedAny = true;
          } catch (e) {
            // File not in candidate path
          }
        }

        // Also call local-tts FastAPI server delete endpoint
        try {
          const localTtsUrl =
            process.env.INDICF5_BASE_URL || "http://127.0.0.1:8001";
          const deleteReq = http.request(
            `${localTtsUrl}/tts/outputs/${encodeURIComponent(filename)}`,
            { method: "DELETE" },
          );
          deleteReq.on("error", () => {});
          deleteReq.end();
        } catch {
          // Ignore
        }

        return res.json({
          success: true,
          message: `File ${filename} deleted from file manager and disk storage.`,
        });
      } catch (error) {
        next(error);
      }
    },

    async getEngineConfig(req, res, next) {
      try {
        const localTtsUrl =
          process.env.INDICF5_BASE_URL || "http://127.0.0.1:8001";
        const result = await requestJson(`${localTtsUrl}/tts/config`);
        return res.json(result?.body || {});
      } catch (error) {
        next(error);
      }
    },

    async updateEngineConfig(req, res, next) {
      try {
        const localTtsUrl =
          process.env.INDICF5_BASE_URL || "http://127.0.0.1:8001";
        const result = await requestJson(`${localTtsUrl}/tts/config`, {
          method: "POST",
          body: req.body,
        });
        return res.status(result.statusCode || 200).json(result?.body || {});
      } catch (error) {
        next(error);
      }
    },

    async createBatchJob(req, res, next) {
      try {
        const localTtsUrl =
          process.env.INDICF5_BASE_URL || "http://127.0.0.1:8001";
        const result = await requestJson(`${localTtsUrl}/tts/batch-jobs`, {
          method: "POST",
          body: req.body,
        });
        return res.status(result.statusCode || 200).json(result?.body || {});
      } catch (error) {
        next(error);
      }
    },

    async getBatchJob(req, res, next) {
      try {
        const localTtsUrl =
          process.env.INDICF5_BASE_URL || "http://127.0.0.1:8001";
        const result = await requestJson(
          `${localTtsUrl}/tts/batch-jobs/${encodeURIComponent(req.params.batchId)}`,
        );
        return res.status(result.statusCode || 200).json(result?.body || {});
      } catch (error) {
        next(error);
      }
    },

    async downloadBatchZip(req, res, next) {
      try {
        const localTtsUrl =
          process.env.INDICF5_BASE_URL || "http://127.0.0.1:8001";
        const batchId = encodeURIComponent(req.params.batchId);
        return new Promise((resolve) => {
          const proxyReq = http.get(
            `${localTtsUrl}/tts/batch-jobs/${batchId}/download-zip`,
            (proxyRes) => {
              if (proxyRes.statusCode === 200) {
                res.setHeader("Content-Type", "application/zip");
                res.setHeader(
                  "Content-Disposition",
                  `attachment; filename="${batchId}.zip"`,
                );
                proxyRes.pipe(res);
                resolve();
              } else {
                res
                  .status(proxyRes.statusCode || 404)
                  .json({ message: "Batch ZIP file not found." });
                resolve();
              }
            },
          );
          proxyReq.on("error", (err) => {
            if (!res.headersSent) {
              res
                .status(500)
                .json({ message: "Failed to download batch ZIP." });
            }
            resolve();
          });
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

function fetchJson(url, options = {}) {
  return requestJson(url, options);
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === "https:" ? https : http;
    const bodyText = options.body ? JSON.stringify(options.body) : null;
    const headers = {
      ...(options.headers || {}),
    };
    if (bodyText) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(bodyText);
    }

    const request = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: options.method || "GET",
        headers,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          try {
            resolve({
              statusCode: response.statusCode,
              body: text ? JSON.parse(text) : {},
            });
          } catch {
            resolve({ statusCode: response.statusCode, body: {} });
          }
        });
        response.on("error", reject);
      },
    );
    request.on("error", reject);
    if (bodyText) {
      request.write(bodyText);
    }
    request.end();
  });
}
