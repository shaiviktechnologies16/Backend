import Joi from "joi";

export const createPlatformWhatsappConnectionSchema = Joi.object({
  name: Joi.string().trim().max(255).required(),

  provider: Joi.string().valid("EVOLUTION").default("EVOLUTION"),

  phoneNumber: Joi.string().trim().max(50).allow(null, "").default(null),

  credentials: Joi.object().allow(null).default(null),

  metadata: Joi.object().default({}),
});

export const updatePlatformWhatsappConnectionSchema = Joi.object({
  name: Joi.string().trim().max(255),

  phoneNumber: Joi.string().trim().max(50).allow(null, ""),

  status: Joi.string().valid(
    "PENDING",
    "CONNECTING",
    "CONNECTED",
    "DISCONNECTED",
    "ERROR",
  ),

  qualityRating: Joi.string().allow(null, ""),

  credentials: Joi.object().allow(null),

  metadata: Joi.object(),
}).min(1);
