import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractClientIp,
  normalizeIp,
  getNetworkIdentityHash,
} from "./network-identity.util.js";

describe("network-identity.util", () => {
  it("extracts IP from Cloudflare header first", () => {
    const req = {
      headers: {
        "cf-connecting-ip": "203.0.113.195",
        "x-real-ip": "198.51.100.1",
        "x-forwarded-for": "198.51.100.2, 198.51.100.3",
      },
      ip: "127.0.0.1",
    };
    assert.equal(extractClientIp(req), "203.0.113.195");
  });

  it("extracts IP from X-Real-IP if Cloudflare header is missing", () => {
    const req = {
      headers: {
        "x-real-ip": "198.51.100.1",
        "x-forwarded-for": "198.51.100.2, 198.51.100.3",
      },
      ip: "127.0.0.1",
    };
    assert.equal(extractClientIp(req), "198.51.100.1");
  });

  it("extracts first IP from X-Forwarded-For if previous headers are missing", () => {
    const req = {
      headers: {
        "x-forwarded-for": "198.51.100.2, 198.51.100.3",
      },
      ip: "127.0.0.1",
    };
    assert.equal(extractClientIp(req), "198.51.100.2");
  });

  it("normalizes IPv4 and mapped IPv6 addresses", () => {
    assert.equal(normalizeIp("::ffff:192.168.1.50"), "192.168.1.50");
    assert.equal(normalizeIp("192.168.1.50:8080"), "192.168.1.50");
    assert.equal(normalizeIp("[2001:db8::1]:8080"), "2001:db8::1");
  });

  it("produces deterministic HMAC-SHA256 network identity hash for same IP across sessions", () => {
    const hash1 = getNetworkIdentityHash("198.51.100.50", "secret-123");
    const hash2 = getNetworkIdentityHash("::ffff:198.51.100.50", "secret-123");
    const hashDifferentIp = getNetworkIdentityHash(
      "203.0.113.10",
      "secret-123",
    );

    assert.equal(typeof hash1, "string");
    assert.equal(hash1.length, 64);
    assert.equal(
      hash1,
      hash2,
      "Incognito mapped IP must resolve to identical network identity hash",
    );
    assert.notEqual(
      hash1,
      hashDifferentIp,
      "Different networks must receive distinct identity hashes",
    );
  });
});
