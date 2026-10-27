import { AppError } from "./AppError.js";

export class ProviderError extends AppError {
  constructor(message = "AI provider error.", options = {}) {
    const statusCode = options.statusCode || 502;
    const errorCode = options.errorCode || "PROVIDER_ERROR";
    super(message, statusCode, errorCode, options);

    this.provider = options.provider || null;
    this.model = options.model || null;
    this.upstreamStatus = options.upstreamStatus || null;
    this.endpoint = options.endpoint || null;
    this.isTransient = options.isTransient ?? null;
    this.tokensEmitted = options.tokensEmitted ?? null;
    this.tokensEmittedCount = options.tokensEmittedCount ?? null;
    this.attemptedModels = options.attemptedModels || null;

    if (options.cause && !this.cause) {
      this.cause = options.cause;
    }
  }
}
