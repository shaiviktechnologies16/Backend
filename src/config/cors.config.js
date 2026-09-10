import cors from "cors";
import envConfig from "./env.config.js";

export const configureCorsPolicy = () => {
  const allowedOriginList =
    envConfig.frontend?.corsAllowedOrigins?.length > 0
      ? envConfig.frontend.corsAllowedOrigins
      : ["http://localhost:3000", "http://localhost:3001"];

  return cors({
    origin: (incomingRequestOrigin, callback) => {
      // Allow requests with no origin header (like mobile apps, curl, server-to-server)
      if (!incomingRequestOrigin) {
        return callback(null, true);
      }

      // Allow request if origin is in allowed origins list or in local environment
      if (
        allowedOriginList.includes(incomingRequestOrigin) ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    exposedHeaders: ["x-visitor-id"],
  });
};
