import Joi from "joi";

export const createOrganizationInvitationSchema = Joi.object({
  organizationId: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid("OWNER", "ADMIN", "MEMBER").required(),
  permissionIds: Joi.array().items(Joi.string().uuid()).default([]),
});

export const acceptOrganizationInvitationSchema = Joi.object({
  name: Joi.string().min(2).max(100).allow("").optional(),
  password: Joi.string().min(8).allow("").optional(),
});
