import Joi from "joi";

export const updateOrganizationFeatureAccessValidator = Joi.object({
  feature: Joi.string().valid("WHATSAPP").required(),

  enabled: Joi.boolean().required(),
});
