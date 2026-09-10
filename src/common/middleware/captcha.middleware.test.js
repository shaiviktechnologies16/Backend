import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createCaptchaMiddleware } from "./captcha.middleware.js";
import { captchaService } from "../security/captcha.service.js";

test("captchaMiddleware passes through when CAPTCHA is disabled in platform config", async () => {
  const getPlatformConfigUseCase = {
    execute: async () => [
      { configKey: "CAPTCHA_PROTECTION_ENABLED", configValue: "false" },
    ],
  };

  const middleware = createCaptchaMiddleware({ getPlatformConfigUseCase });
  const req = { body: {} };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  await middleware(req, {}, next);
  assert.equal(nextCalled, true);
});

test("captchaMiddleware blocks request when CAPTCHA is enabled and fields are missing", async () => {
  const getPlatformConfigUseCase = {
    execute: async () => [
      { configKey: "CAPTCHA_PROTECTION_ENABLED", configValue: "true" },
    ],
  };

  const middleware = createCaptchaMiddleware({ getPlatformConfigUseCase });
  const req = { body: { email: "user@example.com", password: "password" } };

  let statusSent = 0;
  let jsonSent = null;

  const res = {
    status: (s) => {
      statusSent = s;
      return {
        json: (j) => {
          jsonSent = j;
        },
      };
    },
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  await middleware(req, res, next);
  assert.equal(nextCalled, false);
  assert.equal(statusSent, 400);
  assert.equal(jsonSent.error.code, "INVALID_CAPTCHA");
});

test("captchaMiddleware passes request when CAPTCHA is enabled and code is valid", async () => {
  const challenge = captchaService.generateCaptcha();
  const token = challenge.captchaToken;

  captchaService.store.set(token, {
    hash: crypto.createHash("sha256").update("testcode").digest("hex"),
    expiresAt: Date.now() + 60000,
  });

  const getPlatformConfigUseCase = {
    execute: async () => [
      { configKey: "CAPTCHA_PROTECTION_ENABLED", configValue: "true" },
    ],
  };

  const middleware = createCaptchaMiddleware({ getPlatformConfigUseCase });
  const req = { body: { captchaToken: token, captchaInput: "TESTCODE" } };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  await middleware(req, {}, next);
  assert.equal(nextCalled, true);
});
