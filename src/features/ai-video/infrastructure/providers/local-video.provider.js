import { VideoGenerationProvider } from "../../domain/providers/video-generation.provider.js";
import { AppError } from "../../../../common/errors/AppError.js";
import { UploadPurpose } from "../../../upload/domain/constants/upload-purpose.js";

/**
 * Local self-hosted Video Generation Provider (CogVideoX).
 * Communicates with locally hosted video generation models (e.g. CogVideoX)
 * running at http://127.0.0.1:8002 with native endpoints:
 * - POST /generate
 * - GET /status/:jobId
 * - GET /download/:jobId
 */
export class LocalVideoProvider extends VideoGenerationProvider {
  constructor({
    baseUrl = process.env.VIDEO_GENERATION_BASE_URL || "http://127.0.0.1:8002",
    model = process.env.VIDEO_MODEL || "cogvideo-x",
    apiKey = process.env.VIDEO_GENERATION_API_KEY || "",
    timeoutMs = Number(process.env.VIDEO_GENERATION_TIMEOUT_MS) || 600000,
    storageProvider = null,
    uploadFileUseCase = null,
    maxRetries = 2,
    baseRetryDelayMs = 200,
  } = {}) {
    super();
    this.baseUrl = (baseUrl || "http://127.0.0.1:8002").replace(/\/+$/, "");
    this._model = model || "cogvideo-x";
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.storageProvider = storageProvider;
    this.uploadFileUseCase = uploadFileUseCase;
    this.maxRetries = maxRetries;
    this.baseRetryDelayMs = baseRetryDelayMs;
  }

  get name() {
    return "local-video-provider";
  }

  get model() {
    return this._model;
  }

  /**
   * Builds request headers without leaking secrets into logs.
   */
  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  /**
   * Sanitizes any private credentials from error messages.
   */
  sanitizeError(message) {
    if (!message || typeof message !== "string") return "Local video generation failed";
    return message
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
      .replace(/key=[A-Za-z0-9._-]+/gi, "key=[REDACTED]");
  }

  /**
   * Resolves standard dimensions from aspect ratio string if not given directly.
   */
  resolveDimensions(aspectRatio, width, height) {
    if (width && height) {
      return { width: Number(width), height: Number(height) };
    }
    switch (aspectRatio) {
      case "16:9":
        return { width: 1280, height: 720 };
      case "1:1":
        return { width: 768, height: 768 };
      case "9:16":
      default:
        return { width: 720, height: 1280 };
    }
  }

  /**
   * Executes an asynchronous operation with bounded retries for transient errors.
   */
  async executeWithRetry(operation, { maxRetries = this.maxRetries, baseDelayMs = this.baseRetryDelayMs } = {}) {
    let attempt = 0;
    while (true) {
      try {
        return await operation(attempt);
      } catch (err) {
        attempt++;

        const isTransient =
          err.code === "ECONNREFUSED" ||
          err.code === "ENOTFOUND" ||
          err.code === "ETIMEDOUT" ||
          err.name === "TimeoutError" ||
          (err.statusCode && err.statusCode >= 500 && err.statusCode <= 599);

        const isFatal =
          err.errorCode === "INVALID_PROMPT" ||
          err.errorCode === "AI_VIDEO_PROVIDER_INVALID_RESPONSE" ||
          (err.statusCode && err.statusCode >= 400 && err.statusCode < 500 && err.statusCode !== 408);

        if (attempt > maxRetries || !isTransient || isFatal) {
          throw err;
        }

        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Initiates video generation on the local video server.
   */
  async generateVideo({
    prompt,
    negativePrompt = "",
    negative_prompt = "",
    motionPrompt = "",
    motion_prompt = "",
    duration = 5,
    width,
    height,
    aspectRatio = "9:16",
    aspect_ratio,
    fps = 24,
    seed,
    style = "3d-cartoon",
    characters = [],
    referenceImageUrl = null,
    reference_image_url = null,
    imageUrl = null,
    options = {},
  }) {
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      throw new AppError("Prompt is required for video generation", 400, "INVALID_PROMPT");
    }

    const resolvedAspect = aspect_ratio || aspectRatio || "9:16";
    const dims = this.resolveDimensions(resolvedAspect, width, height);
    const resolvedRefUrl = reference_image_url || referenceImageUrl || imageUrl || null;
    const resolvedNegPrompt = negative_prompt || negativePrompt || options.negativePrompt || options.negative_prompt || null;
    const resolvedMotion = motion_prompt || motionPrompt || options.motionPrompt || options.motion_prompt || "";
    const resolvedFps = Number(fps || options.fps) || 24;
    const resolvedSeed = seed !== undefined ? seed : options.seed !== undefined ? options.seed : undefined;
    const resolvedDuration = Number(duration || options.duration) || 5;

    const payload = {
      model: this._model,
      prompt: prompt.trim(),
      duration: resolvedDuration,
      aspect_ratio: resolvedAspect,
      width: dims.width,
      height: dims.height,
      fps: resolvedFps,
      style,
      characters: (characters || []).map((c) => ({
        name: c.name,
        reference_image_url: c.referenceImageUrl || c.url || null,
      })),
      reference_image_url: resolvedRefUrl,
      ...(resolvedNegPrompt ? { negative_prompt: resolvedNegPrompt } : {}),
      ...(resolvedMotion ? { motion_prompt: resolvedMotion } : {}),
      ...(resolvedSeed !== undefined ? { seed: resolvedSeed } : {}),
      ...options,
    };

    return await this.executeWithRetry(async () => {
      try {
        const res = await fetch(`${this.baseUrl}/generate`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(Math.min(this.timeoutMs, 30000)),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (res.status === 503) {
            throw new AppError(
              `Local video provider unavailable: ${this.sanitizeError(text)}`,
              503,
              "AI_VIDEO_PROVIDER_UNAVAILABLE",
            );
          }
          throw new AppError(
            `Local video provider returned HTTP ${res.status}: ${this.sanitizeError(text)}`,
            res.status >= 500 ? 502 : 400,
            "AI_VIDEO_GENERATION_FAILED",
          );
        }

        let data;
        try {
          data = await res.json();
        } catch (_) {
          throw new AppError(
            "Local video provider returned invalid JSON response",
            502,
            "AI_VIDEO_PROVIDER_INVALID_RESPONSE",
          );
        }

        const jobId = data.jobId || data.id || data.job_id || `job-${Date.now()}`;
        const status = (data.status || "GENERATING").toUpperCase();
        const videoUrl = data.videoUrl || data.url || data.video_url || null;
        const localPath = data.localPath || data.local_path || null;

        return {
          provider: this.name,
          model: this._model,
          jobId,
          status: videoUrl ? "READY" : status,
          ...(videoUrl ? { videoUrl, assetUrl: videoUrl } : {}),
          ...(localPath ? { localPath } : {}),
          duration: resolvedDuration,
          width: dims.width,
          height: dims.height,
          fps: resolvedFps,
          metadata: {
            prompt: payload.prompt,
            motionPrompt: resolvedMotion,
            duration: resolvedDuration,
            aspectRatio: resolvedAspect,
            style,
            charactersCount: characters.length,
            hasReferenceImage: Boolean(resolvedRefUrl),
          },
        };
      } catch (err) {
        if (err instanceof AppError) throw err;
        if (err.name === "TimeoutError" || err.message?.includes("timed out")) {
          throw new AppError(
            "Local video generation request timed out",
            408,
            "AI_VIDEO_GENERATION_TIMEOUT",
          );
        }
        if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.message?.includes("fetch failed")) {
          throw new AppError(
            `Local video provider is unreachable at ${this.baseUrl}`,
            503,
            "AI_VIDEO_PROVIDER_UNAVAILABLE",
          );
        }
        throw new AppError(
          `Failed to start local video generation: ${this.sanitizeError(err.message)}`,
          500,
          "AI_VIDEO_GENERATION_FAILED",
        );
      }
    });
  }

  /**
   * Polls the generation status of a video job.
   */
  async getGenerationStatus(jobId) {
    if (!jobId) {
      throw new AppError("Job ID is required", 400, "MISSING_JOB_ID");
    }

    return await this.executeWithRetry(async () => {
      try {
        const res = await fetch(`${this.baseUrl}/status/${encodeURIComponent(jobId)}`, {
          method: "GET",
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new AppError(`Video job '${jobId}' not found on local provider`, 404, "JOB_NOT_FOUND");
          }
          throw new AppError(`Status check failed with HTTP ${res.status}`, 502, "AI_VIDEO_PROVIDER_UNAVAILABLE");
        }

        let data;
        try {
          data = await res.json();
        } catch (_) {
          throw new AppError("Invalid JSON returned by status endpoint", 502, "AI_VIDEO_PROVIDER_INVALID_RESPONSE");
        }

        const rawStatus = (data.status || "").toUpperCase();

        let status = "GENERATING";
        if (rawStatus === "COMPLETED" || rawStatus === "READY" || rawStatus === "DONE" || rawStatus === "SUCCESS") {
          status = "READY";
        } else if (rawStatus === "FAILED" || rawStatus === "ERROR") {
          status = "FAILED";
        }

        const videoUrl = data.videoUrl || data.url || data.video_url || (status === "READY" ? `${this.baseUrl}/download/${jobId}` : null);
        const localPath = data.localPath || data.local_path || null;

        return {
          provider: this.name,
          model: this._model,
          jobId,
          status,
          progress: data.progress !== undefined ? Number(data.progress) : (status === "READY" ? 100 : 50),
          videoUrl,
          assetUrl: videoUrl,
          ...(localPath ? { localPath } : {}),
          error: data.error || data.errorMessage || null,
        };
      } catch (err) {
        if (err instanceof AppError) throw err;
        if (err.code === "ECONNREFUSED" || err.message?.includes("fetch failed")) {
          throw new AppError(
            `Local video provider unreachable during status check at ${this.baseUrl}`,
            503,
            "AI_VIDEO_PROVIDER_UNAVAILABLE",
          );
        }
        throw new AppError(
          `Failed to query video status: ${this.sanitizeError(err.message)}`,
          500,
          "AI_VIDEO_GENERATION_FAILED",
        );
      }
    });
  }

  /**
   * Downloads completed video bytes as a Buffer.
   */
  async downloadVideo(jobId) {
    if (!jobId) {
      throw new AppError("Job ID is required for video download", 400, "MISSING_JOB_ID");
    }

    try {
      const downloadUrl = `${this.baseUrl}/download/${encodeURIComponent(jobId)}`;
      const res = await fetch(downloadUrl, {
        method: "GET",
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        throw new AppError(`Failed to download video from local provider (HTTP ${res.status})`, 502, "AI_VIDEO_GENERATION_FAILED");
      }

      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Failed to download video asset: ${this.sanitizeError(err.message)}`, 500, "AI_VIDEO_GENERATION_FAILED");
    }
  }

  /**
   * Uploads downloaded/generated video buffer into Shaivik permanent storage.
   */
  async storeVideoPermanently({
    rawUrl = null,
    buffer = null,
    organizationId = null,
    projectId = null,
    jobId = null,
    options = {},
  }) {
    let videoBuffer = buffer;

    if (!videoBuffer && rawUrl) {
      try {
        const res = await fetch(rawUrl, { signal: AbortSignal.timeout(60000) });
        if (res.ok) {
          videoBuffer = Buffer.from(await res.arrayBuffer());
        }
      } catch (_) {
        // Fall back to returning rawUrl if fetch fails
      }
    }

    if (!videoBuffer) {
      return rawUrl;
    }

    const filename = `scene-video-${jobId || Date.now()}.mp4`;

    if (this.storageProvider) {
      try {
        const stored = await this.storageProvider.upload({
          buffer: videoBuffer,
          originalName: filename,
          mimeType: "video/mp4",
          purpose: UploadPurpose.AI_VIDEO_SCENE_VIDEO || "ai-video-scene-video",
          organizationId,
          projectId,
        });
        return stored.url;
      } catch (_) {}
    } else if (this.uploadFileUseCase) {
      try {
        const record = await this.uploadFileUseCase.execute({
          userId: options.userId || "system",
          purpose: UploadPurpose.AI_VIDEO_SCENE_VIDEO || "ai-video-scene-video",
          organizationId,
          projectId,
          file: {
            buffer: videoBuffer,
            originalname: filename,
            mimetype: "video/mp4",
            size: videoBuffer.length,
          },
        });
        return record.storageUrl;
      } catch (_) {}
    }

    return rawUrl;
  }
}
