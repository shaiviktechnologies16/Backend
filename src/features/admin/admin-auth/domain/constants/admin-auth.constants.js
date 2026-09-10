export const ADMIN_AUTH = Object.freeze({
  ACCESS_TOKEN_EXPIRES_IN: "15m",
  REFRESH_TOKEN_EXPIRES_IN: "7d",

  ROLES: {
    PLATFORM_ADMIN: "PLATFORM_ADMIN",
    PLATFORM_MANAGER: "PLATFORM_MANAGER",
  },

  MESSAGES: Object.freeze({
    LOGIN_SUCCESS: "Admin login successful.",
    LOGOUT_SUCCESS: "Admin logout successful.",

    INVALID_CREDENTIALS: "Invalid email or password.",
    ADMIN_ACCESS_REQUIRED: "You are not authorized to access the admin portal.",
    ACCOUNT_DISABLED: "Your administrator account has been disabled.",
    UNAUTHORIZED: "Unauthorized.",
    TOKEN_EXPIRED: "Token has expired.",
    INVALID_TOKEN: "Invalid token.",
  }),
});
