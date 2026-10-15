import cors from "cors";
import envConfig from "./env.config.js";

export const configureCorsPolicy = () => {
  const allowedOriginList =
    envConfig.frontend?.corsAllowedOrigins?.length > 0
      ? envConfig.frontend.corsAllowedOrigins
      : ["http://localhost:3000", "http://localhost:3001"];

  const defaultAllowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://admin.shaiviktechnologies.in",
    "https://shaiviktechnologies.in",
    "https://www.shaiviktechnologies.in",
  ];

  const fullAllowedOrigins = Array.from(
    new Set([...allowedOriginList, ...defaultAllowedOrigins]),
  );

  return cors((req, callback) => {
    const incomingRequestOrigin = req.header("Origin");

    // Public chat and public embed endpoints must allow any origin (e.g. client websites embedding the widget)
    const requestPath = req.path || req.originalUrl || req.url || "";
    const isPublicEndpoint =
      requestPath.startsWith("/api/public") ||
      requestPath.startsWith("/api/v1/public");

    if (isPublicEndpoint) {
      return callback(null, {
        origin: incomingRequestOrigin || true,
        credentials: true,
        exposedHeaders: ["x-visitor-id", "x-conversation-id"],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "Accept",
          "x-visitor-id",
          "x-conversation-id",
          "x-client-message-id",
          "x-organization-id",
          "x-project-id",
          "Cache-Control",
          "Pragma",
        ],
      });
    }

    // Allow requests with no origin header (like mobile apps, curl, server-to-server)
    if (!incomingRequestOrigin) {
      return callback(null, {
        origin: true,
        credentials: true,
        exposedHeaders: ["x-visitor-id", "x-conversation-id"],
      });
    }

    // Allow request if origin is in allowed origins list or in local environment
    if (
      process.env.NODE_ENV !== "production" ||
      fullAllowedOrigins.includes(incomingRequestOrigin)
    ) {
      return callback(null, {
        origin: incomingRequestOrigin || true,
        credentials: true,
        exposedHeaders: ["x-visitor-id", "x-conversation-id"],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      });
    }

    return callback(null, { origin: false });
  });
};
