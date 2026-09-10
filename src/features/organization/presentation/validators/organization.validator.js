import { body } from "express-validator";

export const createOrganizationValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Organization name is required.")
    .isLength({ min: 3, max: 100 })
    .withMessage("Organization name must be between 3 and 100 characters."),

  body("ownerEmail")
    .trim()
    .notEmpty()
    .withMessage("Owner email is required.")
    .isEmail()
    .withMessage("Invalid owner email address."),

  body("website").optional().isURL().withMessage("Invalid website URL."),

  body("logo").optional().isURL().withMessage("Invalid logo URL."),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters."),
];

export const updateOrganizationValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Organization name must be between 3 and 100 characters."),

  body("website").optional().isURL().withMessage("Invalid website URL."),

  body("logo").optional().isURL().withMessage("Invalid logo URL."),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters."),
];
