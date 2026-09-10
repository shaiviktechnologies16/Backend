import Joi from "joi";

export const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(3).max(255).required().messages({
    "string.empty": "Project name is required.",
    "string.min": "Project name must be at least 3 characters.",
    "string.max": "Project name must not exceed 255 characters.",
    "any.required": "Project name is required.",
  }),

  description: Joi.string()
    .trim()
    .max(2000)
    .allow("", null)
    .optional()
    .messages({
      "string.max": "Description must not exceed 2000 characters.",
    }),
});
