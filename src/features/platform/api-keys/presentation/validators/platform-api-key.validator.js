import Joi from "joi";

export const createPlatformApiKeySchema = Joi.object({
  provider: Joi.string().trim().max(50).required(),

  name: Joi.string().trim().max(100).required(),

  description: Joi.string().trim().allow("", null).max(1000),

  value: Joi.string().trim().min(1).required(),

  isActive: Joi.boolean().default(true),
});

export const updatePlatformApiKeySchema = Joi.object({
  provider: Joi.string().trim().max(50),

  name: Joi.string().trim().max(100),

  description: Joi.string().trim().allow("", null).max(1000),

  value: Joi.string().trim().min(1),

  isActive: Joi.boolean(),
}).min(1);
