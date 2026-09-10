import Joi from "joi";

const parameterSchema = Joi.object({
  type: Joi.string().valid("object").required(),
  properties: Joi.object().required(),
  required: Joi.array().items(Joi.string()).optional(),
}).required();

const httpConfigurationSchema = Joi.object({
  method: Joi.string()
    .valid("GET", "POST", "PUT", "PATCH", "DELETE")
    .required(),

  url: Joi.string().uri().required(),

  headers: Joi.object().pattern(Joi.string(), Joi.string()).default({}),

  parameters: parameterSchema,
}).required();

const captureLeadConfigurationSchema = Joi.object({
  action: Joi.string().valid("CAPTURE_LEAD").required(),

  parameters: parameterSchema,
}).required();

const configurationSchema = Joi.alternatives()
  .try(httpConfigurationSchema, captureLeadConfigurationSchema)
  .required();

export const createAgentToolSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),

  description: Joi.string().trim().min(1).max(2000).required(),

  type: Joi.string().valid("HTTP").required(),

  credentialId: Joi.string().uuid().allow(null).optional(),

  configuration: configurationSchema,
});

export const updateAgentToolSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),

  description: Joi.string().trim().min(1).max(2000).optional(),

  type: Joi.string().valid("HTTP").optional(),

  credentialId: Joi.string().uuid().allow(null).optional(),

  configuration: configurationSchema.optional(),

  enabled: Joi.boolean().optional(),
}).min(1);
