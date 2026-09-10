import Joi from "joi";

export const createWhatsappConnectionSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).required(),

  provider: Joi.string()
    .trim()
    .valid("META", "EVOLUTION")
    .required(),

  phoneNumber: Joi.string().trim().max(50).allow("", null).optional(),

  phoneNumberId: Joi.string().trim().max(255).allow("", null).optional(),

  businessAccountId: Joi.string()
    .trim()
    .max(255)
    .allow("", null)
    .optional(),

  projectId: Joi.string().uuid().allow(null).optional(),

  agentId: Joi.string().uuid().allow(null).optional(),

  credentials: Joi.object().allow(null).optional(),

  metadata: Joi.object().optional(),
});

export const updateWhatsappConnectionSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).optional(),

  provider: Joi.string()
    .trim()
    .valid("META", "EVOLUTION")
    .optional(),

  phoneNumber: Joi.string().trim().max(50).allow("", null).optional(),

  phoneNumberId: Joi.string().trim().max(255).allow("", null).optional(),

  businessAccountId: Joi.string()
    .trim()
    .max(255)
    .allow("", null)
    .optional(),

  status: Joi.string().trim().max(50).optional(),

  qualityRating: Joi.string()
    .trim()
    .max(50)
    .allow("", null)
    .optional(),

  projectId: Joi.string().uuid().allow(null).optional(),

  agentId: Joi.string().uuid().allow(null).optional(),

  credentials: Joi.object().allow(null).optional(),

  metadata: Joi.object().optional(),
}).min(1);
