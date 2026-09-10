import { randomUUID } from "crypto";

export const visitorMiddleware = (req, res, next) => {
  let visitorId = req.headers["x-visitor-id"];

  if (!visitorId) {
    visitorId = randomUUID();
  }

  req.visitorId = visitorId;

  res.setHeader("x-visitor-id", visitorId);

  next();
};
