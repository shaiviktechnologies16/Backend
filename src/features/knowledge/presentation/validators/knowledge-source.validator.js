import Joi from "joi";

export const createKnowledgeSourceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),

  type: Joi.string().trim().min(1).max(50).required(),

  sourceUrl: Joi.string().trim().uri().allow("", null).optional(),

  filePath: Joi.string().trim().max(2000).allow("", null).optional(),

  content: Joi.string().allow("", null).optional(),

  metadata: Joi.object().optional(),
});

export const updateKnowledgeSourceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),

  type: Joi.string().trim().min(1).max(50).optional(),

  sourceUrl: Joi.string().trim().uri().allow("", null).optional(),

  filePath: Joi.string().trim().max(2000).allow("", null).optional(),

  content: Joi.string().allow("", null).optional(),

  status: Joi.string().trim().min(1).max(50).optional(),

  metadata: Joi.object().optional(),
}).min(1);
