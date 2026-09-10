import test from "node:test";
import assert from "node:assert/strict";
import { UpdatePlatformConfigUseCase } from "./update-platform-config.usecase.js";

test("UpdatePlatformConfigUseCase automatically creates config key if it does not exist in DB", async () => {
  let createdData = null;

  const mockRepo = {
    findByKey: async () => null,
    create: async (data) => {
      createdData = data;
      return data;
    },
    update: async () => {},
  };

  const mockEncryption = {
    encrypt: (val) => `encrypted_${val}`,
  };

  const useCase = new UpdatePlatformConfigUseCase({
    platformConfigRepository: mockRepo,
    encryptionService: mockEncryption,
  });

  const result = await useCase.execute({
    configKey: "CAPTCHA_PROTECTION_ENABLED",
    configValue: "true",
    isSecret: false,
    description: "Test description",
  });

  assert.equal(createdData.configKey, "CAPTCHA_PROTECTION_ENABLED");
  assert.equal(createdData.configValue, "true");
  assert.equal(createdData.isSecret, false);
  assert.equal(createdData.description, "Test description");
});
