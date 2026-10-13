import { randomUUID } from "crypto";
import {
  extractClientIp,
  getNetworkIdentityHash,
} from "../../../common/utils/network-identity.util.js";

const isValidVisitorId = (id) => {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return false;
  return /^[a-zA-Z0-9_-]{8,128}$/.test(trimmed);
};

export const visitorMiddleware = (req, res, next) => {
  let visitorId = req.headers["x-visitor-id"];

  if (!isValidVisitorId(visitorId)) {
    visitorId = randomUUID();
  } else {
    visitorId = visitorId.trim();
  }

  const clientIp = extractClientIp(req);
  const networkIdentityHash = getNetworkIdentityHash(clientIp);

  req.visitorId = visitorId;
  req.clientIp = clientIp;
  req.networkIdentityHash = networkIdentityHash;

  res.setHeader("x-visitor-id", visitorId);

  next();
};
