import Joi from "joi";

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).messages({
    "string.min": "Name must be at least 2 characters.",
    "string.max": "Name cannot exceed 255 characters.",
    "string.empty": "Name cannot be empty.",
  }),

  phone: Joi.string().trim().max(30).allow(null, "").messages({
    "string.max": "Phone number cannot exceed 30 characters.",
  }),
}).min(1);
