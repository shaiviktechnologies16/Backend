import test from "node:test";
import assert from "node:assert/strict";
import { PlatformApiKeyEncryptionService } from "./platform-api-key-encryption.service.js";

const platformApiKeyEncryptionServiceInstance =
  new PlatformApiKeyEncryptionService();

test("PlatformApiKeyEncryptionService encrypts and decrypts with AES-256-GCM authenticated encryption", () => {
  const rawApiKeySecretValue = "sk_live_shaivik_ai_test_key_12345";
  const encryptedPayloadResult =
    platformApiKeyEncryptionServiceInstance.encrypt(rawApiKeySecretValue);

  assert.equal(typeof encryptedPayloadResult, "string");
  const payloadPartsCount = encryptedPayloadResult.split(":").length;
  assert.equal(payloadPartsCount, 3);

  const decryptedSecretValue = platformApiKeyEncryptionServiceInstance.decrypt(
    encryptedPayloadResult,
  );
  assert.equal(decryptedSecretValue, rawApiKeySecretValue);
});

test("PlatformApiKeyEncryptionService detects ciphertext tampering and fails decryption", () => {
  const rawApiKeySecretValue = "sk_live_tamper_test";
  const encryptedPayloadResult =
    platformApiKeyEncryptionServiceInstance.encrypt(rawApiKeySecretValue);

  const payloadPartsList = encryptedPayloadResult.split(":");
  const tamperedPayloadString = `${payloadPartsList[0]}:${payloadPartsList[1]}:ff${payloadPartsList[2].slice(2)}`;

  assert.throws(() => {
    platformApiKeyEncryptionServiceInstance.decrypt(tamperedPayloadString);
  });
});
