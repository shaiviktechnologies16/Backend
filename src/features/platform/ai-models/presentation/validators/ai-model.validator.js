import Joi from "joi";

export const createAIModelSchema = Joi.object({
  provider: Joi.string().trim().max(50).required().messages({
    "string.empty": "Provider is required.",
    "string.max": "Provider must not exceed 50 characters.",
    "any.required": "Provider is required.",
  }),

  model: Joi.string().trim().max(100).required().messages({
    "string.empty": "Model is required.",
    "string.max": "Model must not exceed 100 characters.",
    "any.required": "Model is required.",
  }),

  capability: Joi.string().valid("CHAT", "EMBEDDING").default("CHAT"),

  displayName: Joi.string().trim().max(100).required().messages({
    "string.empty": "Display name is required.",
    "string.max": "Display name must not exceed 100 characters.",
    "any.required": "Display name is required.",
  }),

  description: Joi.string()
    .trim()
    .max(2000)
    .allow("", null)
    .optional()
    .messages({
      "string.max": "Description must not exceed 2000 characters.",
    }),

  status: Joi.string().valid("ACTIVE", "INACTIVE").optional(),
});

export const updateAIModelSchema = Joi.object({
  provider: Joi.string().trim().max(50).optional(),

  model: Joi.string().trim().max(100).optional(),

  capability: Joi.string().valid("CHAT", "EMBEDDING").optional(),

  displayName: Joi.string().trim().max(100).optional(),

  description: Joi.string().trim().max(2000).allow("", null).optional(),

  status: Joi.string().valid("ACTIVE", "INACTIVE").optional(),
}).min(1);
