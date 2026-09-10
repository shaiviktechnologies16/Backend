import crypto from "node:crypto";
import { envConfig } from "../../../../../config/index.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export class ApiKeyEncryptionService {
  constructor() {
    const key = envConfig.security.agentToolEncryptionKey;

    if (!key) {
      throw new Error("AGENT_TOOL_ENCRYPTION_KEY is not configured.");
    }

    if (!/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error(
        "AGENT_TOOL_ENCRYPTION_KEY must be a 32-byte hexadecimal key.",
      );
    }

    this.key = Buffer.from(key, "hex");
  }

  encrypt(value) {
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString("hex"),
      authTag.toString("hex"),
      encrypted.toString("hex"),
    ].join(":");
  }

  decrypt(value) {
    const [ivHex, authTagHex, encryptedHex] = value.split(":");

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error("Invalid encrypted API key format.");
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(ivHex, "hex"),
    );

    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, "hex")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }
}
