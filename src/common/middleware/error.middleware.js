import { AppError } from "../errors/AppError.js";
import { Logger } from "../utils/logger.js";

export const errorMiddleware = (error, req, res, next) => {
  console.log("ERROR OBJECT:", error);
  console.log("ERROR NAME:", error?.name);
  console.log("IS APP ERROR:", error instanceof AppError);

  console.error("[PublicChatDebug] UNHANDLED_ERROR", {
    requestId: req.requestId ?? null,
    route: req.originalUrl || req.url,
    errorName: error?.name,
    errorCode: error?.errorCode || error?.code,
    message: error?.message,
    stack: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
  });

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
      },
    });
  }

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
