import test from "node:test";
import assert from "node:assert/strict";
import {
  isPrivateOrLoopbackIpAddress,
  validateUrlForSsrfPrevention,
} from "./ssrf-guard.util.js";

test("isPrivateOrLoopbackIpAddress accurately identifies internal and private IP ranges", () => {
  assert.equal(isPrivateOrLoopbackIpAddress("127.0.0.1"), true);
  assert.equal(isPrivateOrLoopbackIpAddress("10.0.0.5"), true);
  assert.equal(isPrivateOrLoopbackIpAddress("172.16.0.1"), true);
  assert.equal(isPrivateOrLoopbackIpAddress("192.168.1.100"), true);
  assert.equal(isPrivateOrLoopbackIpAddress("169.254.169.254"), true);
  assert.equal(isPrivateOrLoopbackIpAddress("::1"), true);
  assert.equal(isPrivateOrLoopbackIpAddress("8.8.8.8"), false);
  assert.equal(isPrivateOrLoopbackIpAddress("1.1.1.1"), false);
});

test("validateUrlForSsrfPrevention blocks SSRF attack vectors targeting localhost and private IPs", async () => {
  await assert.rejects(
    async () => {
      await validateUrlForSsrfPrevention("http://127.0.0.1/admin");
    },
    { message: "SSRF_PRIVATE_ADDRESS_BLOCKED" },
  );

  await assert.rejects(
    async () => {
      await validateUrlForSsrfPrevention("http://localhost:3000/api");
    },
    { message: "SSRF_PRIVATE_ADDRESS_BLOCKED" },
  );

  await assert.rejects(
    async () => {
      await validateUrlForSsrfPrevention(
        "http://169.254.169.254/latest/meta-data/",
      );
    },
    { message: "SSRF_PRIVATE_ADDRESS_BLOCKED" },
  );

  const isValidPublicUrl = await validateUrlForSsrfPrevention(
    "https://shaiviktechnologies.in",
  );
  assert.equal(isValidPublicUrl, true);
});
