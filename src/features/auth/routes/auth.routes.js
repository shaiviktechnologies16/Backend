import { Router } from "express";
import { getCaptcha, login, register } from "../controller/auth.controller.js";
import { createAuthenticationRateLimiter } from "../../../common/middleware/rate-limit.middleware.js";

export function createAuthRoutes({ captchaMiddleware } = {}) {
  const router = Router();
  const authenticationRateLimiter = createAuthenticationRateLimiter();

  router.get("/captcha", getCaptcha);
  router.post("/register", register);

  if (captchaMiddleware) {
    router.post("/login", authenticationRateLimiter, captchaMiddleware, login);
  } else {
    router.post("/login", authenticationRateLimiter, login);
  }

  return router;
}

export default createAuthRoutes();
