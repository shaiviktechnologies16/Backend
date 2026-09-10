import crypto from "crypto";
import envConfig from "../../../../../config/env.config.js";

const ENCRYPTION_ALGORITHM_GCM = "aes-256-gcm";
const ENCRYPTION_ALGORITHM_CBC_LEGACY = "aes-256-cbc";
const INITIALIZATION_VECTOR_BYTE_LENGTH_GCM = 12;

export class PlatformApiKeyEncryptionService {
  constructor() {
    const encryptionSecretKeyString = envConfig.security.apiKeyEncryptionSecret;

    if (!encryptionSecretKeyString) {
      throw new Error("API_KEY_ENCRYPTION_SECRET is not configured.");
    }

    this.encryptionSecretBufferKey = crypto
      .createHash("sha256")
      .update(encryptionSecretKeyString)
      .digest();
  }

  encrypt(plainTextApiKeyString) {
    if (!plainTextApiKeyString || typeof plainTextApiKeyString !== "string") {
      throw new Error("INVALID_API_KEY_VALUE");
    }

    const randomInitializationVectorBuffer = crypto.randomBytes(
      INITIALIZATION_VECTOR_BYTE_LENGTH_GCM,
    );

    const gcmCipherInstance = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM_GCM,
      this.encryptionSecretBufferKey,
      randomInitializationVectorBuffer,
    );

    const encryptedDataChunkBuffer = Buffer.concat([
      gcmCipherInstance.update(plainTextApiKeyString, "utf8"),
      gcmCipherInstance.final(),
    ]);

    const authenticationTagBuffer = gcmCipherInstance.getAuthTag();

    const initializationVectorHex =
      randomInitializationVectorBuffer.toString("hex");
    const authenticationTagHex = authenticationTagBuffer.toString("hex");
    const encryptedDataChunkHex = encryptedDataChunkBuffer.toString("hex");

    return `${initializationVectorHex}:${authenticationTagHex}:${encryptedDataChunkHex}`;
  }

  decrypt(encryptedApiKeyPayloadString) {
    if (
      !encryptedApiKeyPayloadString ||
      typeof encryptedApiKeyPayloadString !== "string"
    ) {
      throw new Error("Invalid encrypted API key.");
    }

    const encryptedPayloadPartsList = encryptedApiKeyPayloadString.split(":");

    if (encryptedPayloadPartsList.length === 3) {
      const [
        initializationVectorHex,
        authenticationTagHex,
        encryptedDataChunkHex,
      ] = encryptedPayloadPartsList;

      if (
        !initializationVectorHex ||
        !authenticationTagHex ||
        !encryptedDataChunkHex
      ) {
        throw new Error("Invalid encrypted API key.");
      }

      const gcmDecipherInstance = crypto.createDecipheriv(
        ENCRYPTION_ALGORITHM_GCM,
        this.encryptionSecretBufferKey,
        Buffer.from(initializationVectorHex, "hex"),
      );

      gcmDecipherInstance.setAuthTag(Buffer.from(authenticationTagHex, "hex"));

      const decryptedDataChunkBuffer = Buffer.concat([
        gcmDecipherInstance.update(Buffer.from(encryptedDataChunkHex, "hex")),
        gcmDecipherInstance.final(),
      ]);

      return decryptedDataChunkBuffer.toString("utf8");
    }

    if (encryptedPayloadPartsList.length === 2) {
      const [initializationVectorHex, encryptedDataChunkHex] =
        encryptedPayloadPartsList;

      if (!initializationVectorHex || !encryptedDataChunkHex) {
        throw new Error("Invalid encrypted API key.");
      }

      const cbcDecipherInstance = crypto.createDecipheriv(
        ENCRYPTION_ALGORITHM_CBC_LEGACY,
        this.encryptionSecretBufferKey,
        Buffer.from(initializationVectorHex, "hex"),
      );

      const decryptedLegacyBuffer = Buffer.concat([
        cbcDecipherInstance.update(Buffer.from(encryptedDataChunkHex, "hex")),
        cbcDecipherInstance.final(),
      ]);

      return decryptedLegacyBuffer.toString("utf8");
    }

    throw new Error("Invalid encrypted API key.");
  }
}
