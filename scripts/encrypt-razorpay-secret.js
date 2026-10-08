// scripts/encrypt-razorpay-secret.js

import { PlatformApiKeyEncryptionService } from "../src/features/platform/api-keys/infrastructure/security/platform-api-key-encryption.service.js";

const encryptionService = new PlatformApiKeyEncryptionService();

const secret = process.env.RAZORPAY_KEY_SECRET;

if (!secret) {
  throw new Error("RAZORPAY_KEY_SECRET is missing");
}

const encrypted = encryptionService.encrypt(secret);

console.log(encrypted);
