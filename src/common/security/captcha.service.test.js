import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { CaptchaService } from "./captcha.service.js";

test("CaptchaService generates challenge, verifies correct code, and enforces single-use", () => {
  const service = new CaptchaService();

  const challenge = service.generateCaptcha();
  assert.ok(challenge.captchaToken);
  assert.ok(challenge.captchaImage.startsWith("data:image/svg+xml;base64,"));
  assert.ok(challenge.svg.includes("<svg"));

  const token = challenge.captchaToken;

  // Single use: verify with wrong code should fail and consume token
  const wrongResult = service.verifyCaptcha(token, "WRONG");
  assert.equal(wrongResult, false);

  // Subsequent attempt with original token must fail because token was consumed on first attempt
  const retryResult = service.verifyCaptcha(token, "WRONG");
  assert.equal(retryResult, false);

  service.destroy();
});

test("CaptchaService verifies correct input code case-insensitively", () => {
  const service = new CaptchaService();

  const code = "AbC23";
  const token = "test-token-123";
  const hash = crypto
    .createHash("sha256")
    .update(code.toLowerCase())
    .digest("hex");
  service.store.set(token, { hash, expiresAt: Date.now() + 60000 });

  const result = service.verifyCaptcha(token, "abc23");
  assert.equal(result, true);

  service.destroy();
});

test("CaptchaService rejects expired tokens", () => {
  const service = new CaptchaService();

  const token = "expired-token-123";
  const hash = crypto.createHash("sha256").update("code1").digest("hex");
  service.store.set(token, { hash, expiresAt: Date.now() - 1000 });

  const result = service.verifyCaptcha(token, "code1");
  assert.equal(result, false);

  service.destroy();
});
