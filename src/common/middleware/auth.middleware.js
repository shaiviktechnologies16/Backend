export const authenticate = (userRepository, jwtService) => {
  return async (req, res, next) => {
    try {
      if (req.method === "OPTIONS") {
        return next();
      }

      const authorization = req.headers.authorization;

      if (!authorization) {
        return res.status(401).json({
          success: false,
          message: "Authorization header is required.",
        });
      }

      const token = authorization.substring(7);
      const payload = jwtService.verifyAccessToken(token);
      const user = await userRepository.findById(payload.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_DISABLED",
          message: "Account disabled",
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        platformRole: user.platformRole,
      };

      next();
    } catch (error) {
      console.log("AUTH ERROR:", error);

      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }
  };
};
