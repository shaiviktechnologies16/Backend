import { AppError } from "./AppError.js";

export class ProviderError extends AppError {
  constructor(message = "AI provider error.", options = {}) {
    super(message, 502, "PROVIDER_ERROR", options);
  }
}
