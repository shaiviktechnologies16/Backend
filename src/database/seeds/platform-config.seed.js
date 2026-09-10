import "dotenv/config";

import { AppDataSource } from "../datasource.js";

import { PlatformConfigOrmEntity } from "../../features/platform/config/infrastructure/database/platform-config.orm-entity.js";

const configs = [
  {
    configKey: "AI_PROVIDER",
    configValue: process.env.AI_PROVIDER,
    isSecret: false,
    description: "AI provider used by platform",
  },

  {
    configKey: "OLLAMA_BASE_URL",
    configValue: process.env.OLLAMA_BASE_URL,
    isSecret: false,
    description: "Ollama server URL",
  },

  {
    configKey: "OLLAMA_MODEL",
    configValue: process.env.OLLAMA_MODEL,
    isSecret: false,
    description: "Default Ollama model",
  },

  {
    configKey: "OLLAMA_THINK",
    configValue: process.env.OLLAMA_THINK,
    isSecret: false,
    description: "Enable Ollama thinking",
  },

  {
    configKey: "AI_RAG_SYSTEM_PROMPT",
    configValue: process.env.AI_RAG_SYSTEM_PROMPT,
    isSecret: false,
    description: "RAG system prompt",
  },

  {
    configKey: "AI_RAG_NO_CONTEXT_MESSAGE",
    configValue: process.env.AI_RAG_NO_CONTEXT_MESSAGE,
    isSecret: false,
    description: "Message when no knowledge context found",
  },

  {
    configKey: "AI_RAG_SIMILARITY_THRESHOLD",
    configValue: process.env.AI_RAG_SIMILARITY_THRESHOLD,
    isSecret: false,
    description: "RAG similarity threshold",
  },

  {
    configKey: "AI_RAG_TOP_K",
    configValue: process.env.AI_RAG_TOP_K,
    isSecret: false,
    description: "RAG top K results",
  },

  {
    configKey: "TTS_PROVIDER",
    configValue: process.env.TTS_PROVIDER,
    isSecret: false,
    description: "Text-to-speech provider used by platform",
  },

  {
    configKey: "INDICF5_BASE_URL",
    configValue: process.env.INDICF5_BASE_URL,
    isSecret: false,
    description: "IndicF5 TTS server URL",
  },

  {
    configKey: "EMAIL_FROM",
    configValue: process.env.EMAIL_FROM,
    isSecret: false,
    description: "Default sender email",
  },

  {
    configKey: "FRONTEND_URL",
    configValue: process.env.FRONTEND_URL,
    isSecret: false,
    description: "Frontend application URL",
  },
  {
    configKey: "PLATFORM_LOGO",
    configValue: null,
    isSecret: false,
    description: "Platform logo URL",
  },
  {
    configKey: "PLATFORM_NAME",
    configValue: "AI Platform",
    isSecret: false,
    description: "Platform display name",
  },

  {
    configKey: "PLATFORM_FAVICON",
    configValue: null,
    isSecret: false,
    description: "Platform favicon URL",
  },

  {
    configKey: "PLATFORM_DESCRIPTION",
    configValue: "AI workspace platform",
    isSecret: false,
    description: "Platform description",
  },

  {
    configKey: "PLATFORM_PRIMARY_COLOR",
    configValue: "#FF6B00",
    isSecret: false,
    description: "Platform primary theme color",
  },

  {
    configKey: "PLATFORM_SECONDARY_COLOR",
    configValue: "#111827",
    isSecret: false,
    description: "Platform secondary theme color",
  },
  {
    configKey: "CAPTCHA_PROTECTION_ENABLED",
    configValue: "false",
    isSecret: false,
    description: "Enable CAPTCHA protection for Platform and Workspace logins",
  },
  {
    configKey: "RAZORPAY_KEY_ID",
    configValue: process.env.RAZORPAY_KEY_ID || "",
    isSecret: false,
    description: "Razorpay Payment Gateway Key ID",
  },
  {
    configKey: "RAZORPAY_KEY_SECRET",
    configValue: process.env.RAZORPAY_KEY_SECRET || "",
    isSecret: true,
    description: "Razorpay Payment Gateway Key Secret",
  },
  {
    configKey: "RAZORPAY_WEBHOOK_SECRET",
    configValue: process.env.RAZORPAY_WEBHOOK_SECRET || "",
    isSecret: true,
    description: "Razorpay Webhook Signature Secret",
  },
  {
    configKey: "PAYMENT_GATEWAY_ENABLED",
    configValue: "true",
    isSecret: false,
    description: "Enable or disable platform payment gateway checkout",
  },
  {
    configKey: "BANK_NAME",
    configValue: "",
    isSecret: false,
    description: "Platform Bank Name",
  },
  {
    configKey: "BANK_ACCOUNT_HOLDER",
    configValue: "",
    isSecret: false,
    description: "Platform Bank Account Holder Name",
  },
  {
    configKey: "BANK_ACCOUNT_NUMBER",
    configValue: "",
    isSecret: false,
    description: "Platform Bank Account Number",
  },
  {
    configKey: "BANK_IFSC_CODE",
    configValue: "",
    isSecret: false,
    description: "Platform Bank IFSC Code",
  },
  {
    configKey: "BANK_SWIFT_CODE",
    configValue: "",
    isSecret: false,
    description: "Platform Bank SWIFT / BIC Code",
  },
  {
    configKey: "PLATFORM_UPI_ID",
    configValue: "",
    isSecret: false,
    description: "Platform VPA / UPI ID for direct payments",
  },
  {
    configKey: "PLATFORM_CURRENCY",
    configValue: "INR",
    isSecret: false,
    description: "Platform primary billing currency",
  },
  {
    configKey: "PAYMENT_SETTLEMENT_NOTES",
    configValue: "",
    isSecret: false,
    description: "Platform payment settlement guidelines & notes",
  },
];

async function seed() {
  await AppDataSource.initialize();

  const repository = AppDataSource.getRepository(PlatformConfigOrmEntity);

  for (const config of configs) {
    const allowEmptyConfigs = [
      "PLATFORM_LOGO",
      "PLATFORM_FAVICON",
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
      "RAZORPAY_WEBHOOK_SECRET",
      "BANK_NAME",
      "BANK_ACCOUNT_HOLDER",
      "BANK_ACCOUNT_NUMBER",
      "BANK_IFSC_CODE",
      "BANK_SWIFT_CODE",
      "PLATFORM_UPI_ID",
      "PAYMENT_SETTLEMENT_NOTES",
    ];

    if (!config.configValue && !allowEmptyConfigs.includes(config.configKey)) {
      continue;
    }

    const exists = await repository.findOne({
      where: {
        configKey: config.configKey,
      },
    });

    if (exists) {
      console.log(`Skipped ${config.configKey}`);

      continue;
    }

    await repository.save(config);

    console.log(`Created ${config.configKey}`);
  }

  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
