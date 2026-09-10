import jwt from "jsonwebtoken";
import envConfig from "../../config/env.config.js";

export class JwtService {
  generateAccessToken(payloadData) {
    if (!payloadData || typeof payloadData !== "object") {
      throw new Error("INVALID_JWT_PAYLOAD_STRUCTURE");
    }

    return jwt.sign(payloadData, envConfig.jwt.secret, {
      algorithm: "HS256",
      expiresIn: envConfig.jwt.accessExpiresIn,
    });
  }

  generateRefreshToken(payloadData) {
    if (!payloadData || typeof payloadData !== "object") {
      throw new Error("INVALID_JWT_PAYLOAD_STRUCTURE");
    }

    return jwt.sign(payloadData, envConfig.jwt.secret, {
      algorithm: "HS256",
      expiresIn: envConfig.jwt.refreshExpiresIn,
    });
  }

  verifyAccessToken(accessTokenString) {
    if (!accessTokenString || typeof accessTokenString !== "string") {
      throw new Error("INVALID_ACCESS_TOKEN_STRING");
    }

    const decodedAccessTokenPayload = jwt.verify(
      accessTokenString,
      envConfig.jwt.secret,
      {
        algorithms: ["HS256"],
      },
    );

    if (
      !decodedAccessTokenPayload ||
      typeof decodedAccessTokenPayload !== "object" ||
      Array.isArray(decodedAccessTokenPayload)
    ) {
      throw new Error("MALFORMED_JWT_PAYLOAD_STRUCTURE");
    }

    return decodedAccessTokenPayload;
  }

  verifyRefreshToken(refreshTokenString) {
    if (!refreshTokenString || typeof refreshTokenString !== "string") {
      throw new Error("INVALID_REFRESH_TOKEN_STRING");
    }

    const decodedRefreshTokenPayload = jwt.verify(
      refreshTokenString,
      envConfig.jwt.secret,
      {
        algorithms: ["HS256"],
      },
    );

    if (
      !decodedRefreshTokenPayload ||
      typeof decodedRefreshTokenPayload !== "object" ||
      Array.isArray(decodedRefreshTokenPayload)
    ) {
      throw new Error("MALFORMED_JWT_PAYLOAD_STRUCTURE");
    }

    return decodedRefreshTokenPayload;
  }
}
