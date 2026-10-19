import { AppError } from "../errors/AppError.js";
import { Logger } from "../utils/logger.js";

export const errorMiddleware = (error, req, res, next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
      },
    });
  }

  // Handle PayloadTooLargeError from Express/body-parser and return HTTP 413 instead of 500
  if (
    error.type === "entity.too.large" ||
    error.name === "PayloadTooLargeError" ||
    error.status === 413 ||
    error.statusCode === 413
  ) {
    return res.status(413).json({
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message:
          "Request entity too large. The upload exceeds the maximum allowed size limit.",
      },
    });
  }

  // Handle PostgreSQL connection exhaustion or pool checkout timeout
  if (
    error?.code === "53300" ||
    error?.code === "53400" ||
    error?.code === "57P01" ||
    error?.message?.includes("Connection terminated") ||
    error?.message?.includes("timeout exceeded when connecting") ||
    error?.message?.includes("remaining connection slots are reserved")
  ) {
    console.error("[DatabasePool] Connection error or exhaustion:", {
      requestId: req.requestId ?? null,
      route: req.originalUrl || req.url,
      code: error.code,
      message: error.message,
    });
    return res.status(503).json({
      success: false,
      error: {
        code: "DATABASE_UNAVAILABLE",
        message:
          "The database service is temporarily busy. Please try again shortly.",
      },
    });
  }

  console.error("[Server] UNHANDLED_ERROR", {
    requestId: req.requestId ?? null,
    route: req.originalUrl || req.url,
    errorName: error?.name,
    errorCode: error?.errorCode || error?.code,
    message: error?.message,
    stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
  });

  Logger.error(error.message, {
    name: error.name,
    stack: error.stack,
    endpoint: req.originalUrl,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong.",
    },
  });
};
