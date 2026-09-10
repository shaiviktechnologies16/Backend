import Joi from "joi";

const widgetConfigSchema = Joi.object({
  primaryColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional(),

  position: Joi.string().valid("bottom-right", "bottom-left").optional(),

  title: Joi.string().trim().max(100).allow("", null).optional(),

  welcomeMessage: Joi.string().trim().max(500).allow("", null).optional(),

  placeholder: Joi.string().trim().max(100).allow("", null).optional(),

  showBranding: Joi.boolean().optional(),

  suggestedQuestions: Joi.array()
    .items(Joi.string().trim().max(200).allow("", null))
    .max(5)
    .optional(),
}).default({});

export const createAgentSchema = Joi.object({
  name: Joi.string().trim().min(3).max(255).required(),
  description: Joi.string().trim().max(2000).allow("", null).optional(),
  systemPrompt: Joi.string().trim().required(),
  aiModelId: Joi.string().uuid().required(),
  temperature: Joi.number().min(0).max(2).optional(),
  maxTokens: Joi.number().integer().positive().optional(),
  isDefault: Joi.boolean().optional(),
  visibility: Joi.string().optional(),
  widgetConfig: widgetConfigSchema.optional(),
});

export const updateAgentSchema = Joi.object({
  name: Joi.string().trim().min(3).max(255).optional(),
  description: Joi.string().trim().max(2000).allow("", null).optional(),
  systemPrompt: Joi.string().trim().optional(),
  temperature: Joi.number().min(0).max(2).optional(),
  maxTokens: Joi.number().integer().positive().optional(),
  widgetConfig: widgetConfigSchema.optional(),
}).min(1);
