import test from "node:test";
import assert from "node:assert/strict";
import { JwtService } from "./jwt.service.js";

const jwtServiceInstance = new JwtService();

test("generateAccessToken and verifyAccessToken work cleanly for valid tokens", () => {
  const sampleTokenPayload = { userId: "user-123", email: "test@example.com" };
  const generatedTokenString =
    jwtServiceInstance.generateAccessToken(sampleTokenPayload);
  assert.equal(typeof generatedTokenString, "string");

  const verifiedPayloadResult =
    jwtServiceInstance.verifyAccessToken(generatedTokenString);
  assert.equal(verifiedPayloadResult.userId, "user-123");
  assert.equal(verifiedPayloadResult.email, "test@example.com");
});

test("verifyAccessToken rejects forged alg-none tokens", () => {
  // Construct a forged token with header {"alg":"none","typ":"JWT"}
  const base64HeaderNone = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const base64Payload = Buffer.from(
    JSON.stringify({ userId: "hacker" }),
  ).toString("base64url");
  const forgedNoneTokenString = `${base64HeaderNone}.${base64Payload}.`;

  assert.throws(() => {
    jwtServiceInstance.verifyAccessToken(forgedNoneTokenString);
  });
});
