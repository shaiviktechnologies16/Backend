import crypto from "crypto";

/**
 * Extract raw client IP from Express request, handling Cloudflare, reverse proxies, and direct socket IP.
 * @param {import('express').Request} req
 * @returns {string}
 */
export function extractClientIp(req) {
  if (!req) return "127.0.0.1";

  // 1. Cloudflare header
  const cfConnectingIp = req.headers?.["cf-connecting-ip"];
  if (typeof cfConnectingIp === "string" && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  // 2. X-Real-IP header (Nginx / Reverse proxy)
  const xRealIp = req.headers?.["x-real-ip"];
  if (typeof xRealIp === "string" && xRealIp.trim()) {
    return xRealIp.trim();
  }

  // 3. X-Forwarded-For header (comma-separated list, first element is client IP)
  const xForwardedFor = req.headers?.["x-forwarded-for"];
  if (typeof xForwardedFor === "string" && xForwardedFor.trim()) {
    const firstIp = xForwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  // 4. Express req.ip or socket remote address fallback
  if (typeof req.ip === "string" && req.ip.trim()) {
    return req.ip.trim();
  }

  const remoteAddress =
    req.socket?.remoteAddress || req.connection?.remoteAddress;
  if (typeof remoteAddress === "string" && remoteAddress.trim()) {
    return remoteAddress.trim();
  }

  return "127.0.0.1";
}

/**
 * Normalize IPv4 or IPv6 address.
 * @param {string} ip
 * @returns {string}
 */
export function normalizeIp(ip) {
  if (!ip || typeof ip !== "string") return "127.0.0.1";

  let cleanIp = ip.trim();

  // Handle mapped IPv4 (e.g., ::ffff:127.0.0.1)
  if (cleanIp.startsWith("::ffff:")) {
    cleanIp = cleanIp.slice(7);
  }

  // Handle IPv4 with port (e.g., 192.168.1.1:8080)
  if (cleanIp.includes(".") && cleanIp.includes(":")) {
    cleanIp = cleanIp.split(":")[0];
  }

  // Handle bracketed IPv6 with port (e.g., [2001:db8::1]:8080)
  if (cleanIp.startsWith("[") && cleanIp.includes("]")) {
    cleanIp = cleanIp.slice(1, cleanIp.indexOf("]"));
  }

  return cleanIp.toLowerCase();
}

/**
 * Generate a 64-character deterministic one-way HMAC-SHA256 network identity hash.
 * @param {string} rawIp
 * @param {string|null} customSecret
 * @returns {string}
 */
export function getNetworkIdentityHash(rawIp, customSecret = null) {
  const normalized = normalizeIp(rawIp);
  const secret =
    customSecret ||
    process.env.NETWORK_IDENTITY_SECRET ||
    process.env.JWT_SECRET ||
    "shaivik-network-identity-secret-key-salt";

  return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
}
