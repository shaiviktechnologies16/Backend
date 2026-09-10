import { body } from "express-validator";

import { OrganizationRole } from "../../../organization/domain/constants/organization-role.js";

export const addMemberValidator = [
  body("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID is required.")
    .isUUID()
    .withMessage("Invalid user ID."),

  body("role")
    .optional()
    .isIn(Object.values(OrganizationRole))
    .withMessage("Invalid organization role."),
];

export const updateMemberRoleValidator = [
  body("role")
    .trim()
    .notEmpty()
    .withMessage("Role is required.")
    .isIn(Object.values(OrganizationRole))
    .withMessage("Invalid organization role."),
];
