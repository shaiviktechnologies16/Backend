import { UserContextEntity } from "../../domain/entities/user-context.entity.js";

export const authenticateMiddleware = ({ jwtService }) => {
  return (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = authorization.replace("Bearer ", "");

    const payload = jwtService.verifyAccessToken(token);
    req.context = {
      user: new UserContextEntity({
        id: payload.userId,
        email: payload.email,
        platformRole: payload.platformRole ?? payload.role,
        permissions: payload.permissions ?? [],
      }),
      organization: null,
      project: null,
      agent: null,
    };

    req.user = req.context.user;

    next();
  };
};
