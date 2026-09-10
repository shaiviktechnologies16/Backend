import dotenv from "dotenv";

dotenv.config();

const envConfig = {
  port: Number(process.env.PORT || 3000),

  database: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: process.env.DB_SSL === "true",
    sslCa: process.env.DB_SSL_CA || null,
    sslCaFile: process.env.DB_SSL_CA_FILE || null,
  },

  evolution: {
    baseUrl: process.env.EVOLUTION_API_URL,
    apiKey: process.env.EVOLUTION_API_KEY,
    webhookUrl: process.env.EVOLUTION_WEBHOOK_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    refreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 7),
  },

  ai: {
    provider: process.env.AI_PROVIDER,
    rag: {
      noContextMessage: process.env.AI_RAG_NO_CONTEXT_MESSAGE,
      similarityThreshold: Number(
        process.env.AI_RAG_SIMILARITY_THRESHOLD || 0.7,
      ),
      systemPrompt: process.env.AI_RAG_SYSTEM_PROMPT,
      topK: Number(process.env.AI_RAG_TOP_K || 5),
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL,
      model: process.env.OLLAMA_MODEL,
      think: process.env.OLLAMA_THINK === "true",
    },
  },

  platform: {
    name: process.env.PLATFORM_NAME || "AI Platform",
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
  },

  frontend: {
    url: process.env.FRONTEND_URL,
    corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  },

  security: {
    agentToolEncryptionKey: process.env.AGENT_TOOL_ENCRYPTION_KEY,
    apiKeyEncryptionSecret: process.env.API_KEY_ENCRYPTION_SECRET,
    adminSetupToken: process.env.ADMIN_SETUP_TOKEN,
    organizationApiKey: process.env.ORGANIZATION_API_KEY,
    authRateLimitWindowMinutes: Number(
      process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES || 15,
    ),
    authRateLimitMaxAttempts: Number(
      process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || 5,
    ),
  },
};

export default envConfig;
