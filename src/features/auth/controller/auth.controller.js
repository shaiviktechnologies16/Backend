import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { authService } from "../../../container/services.js";
import { captchaService } from "../../../common/security/captcha.service.js";

export const getCaptcha = asyncHandler(async (req, res) => {
  const challenge = captchaService.generateCaptcha();
  res.status(200).json({
    success: true,
    data: {
      captchaToken: challenge.captchaToken,
      captchaImage: challenge.captchaImage,
    },
  });
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const user = await authService.register({
    name,
    email,
    password,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully.",
    data: user,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login({
    email,
    password,
  });

  res.status(200).json({
    success: true,
    message: "Login successful.",
    data: result,
  });
});
