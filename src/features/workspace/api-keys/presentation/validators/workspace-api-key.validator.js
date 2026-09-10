import Joi from "joi";

export const createWorkspaceApiKeySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),

  description: Joi.string().trim().max(2000).allow(null, "").optional(),

  value: Joi.string().min(1).required(),
});

export const updateWorkspaceApiKeySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),

  description: Joi.string().trim().max(2000).allow(null, "").optional(),

  value: Joi.string().min(1).optional(),
}).min(1);
