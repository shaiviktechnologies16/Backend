import { body } from "express-validator";

export const updateCompanyProfileValidator = [
  body("companyName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Company name must be between 2 and 255 characters."),

  body("logo")
    .optional({ nullable: true })
    .isURL()
    .withMessage("Invalid logo URL."),

  body("coverImage")
    .optional({ nullable: true })
    .isURL()
    .withMessage("Invalid cover image URL."),

  body("tagline")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage("Tagline cannot exceed 255 characters."),

  body("website")
    .optional({ nullable: true })
    .isURL()
    .withMessage("Invalid website URL."),

  body("description")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters."),

  body("email")
    .optional({ nullable: true })
    .trim()
    .isEmail()
    .withMessage("Invalid email address."),

  body("phone")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Phone number cannot exceed 50 characters."),

  body("alternatePhone")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Alternate phone number cannot exceed 50 characters."),

  body("street")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage("Street cannot exceed 255 characters."),

  body("area")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage("Area cannot exceed 255 characters."),

  body("city")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters."),

  body("state")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("State cannot exceed 100 characters."),

  body("country")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Country cannot exceed 100 characters."),

  body("postalCode")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage("Postal code cannot exceed 20 characters."),

  body("industry")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage("Industry cannot exceed 150 characters."),

  body("companySize")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Company size cannot exceed 50 characters."),

  body("foundedYear")
    .optional({ nullable: true })
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage("Invalid founded year."),

  body("businessType")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Business type cannot exceed 100 characters."),

  body("timezone")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Timezone cannot exceed 100 characters."),

  body("currency")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 10 })
    .withMessage("Currency cannot exceed 10 characters."),

  body("language")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage("Language cannot exceed 20 characters."),

  body("linkedin")
    .optional({ nullable: true })
    .isURL()
    .withMessage("Invalid LinkedIn URL."),

  body("twitter")
    .optional({ nullable: true })
    .isURL()
    .withMessage("Invalid Twitter URL."),

  body("instagram")
    .optional({ nullable: true })
    .isURL()
    .withMessage("Invalid Instagram URL."),

  body("facebook")
    .optional({ nullable: true })
    .isURL()
    .withMessage("Invalid Facebook URL."),

  body("youtube")
    .optional({ nullable: true })
    .isURL()
    .withMessage("Invalid YouTube URL."),

  body("primaryColor")
    .optional({ nullable: true })
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Invalid primary color."),

  body("secondaryColor")
    .optional({ nullable: true })
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Invalid secondary color."),

  body("accentColor")
    .optional({ nullable: true })
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Invalid accent color."),
];
