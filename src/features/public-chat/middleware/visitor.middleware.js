import { randomUUID } from "crypto";
import {
  extractClientIp,
  getNetworkIdentityHash,
} from "../../../common/utils/network-identity.util.js";

export const visitorMiddleware = (req, res, next) => {
  let visitorId = req.headers["x-visitor-id"];

  if (!visitorId) {
    visitorId = randomUUID();
  }

  const clientIp = extractClientIp(req);
  const networkIdentityHash = getNetworkIdentityHash(clientIp);

  req.visitorId = visitorId;
  req.clientIp = clientIp;
  req.networkIdentityHash = networkIdentityHash;

  res.setHeader("x-visitor-id", visitorId);

  next();
};
