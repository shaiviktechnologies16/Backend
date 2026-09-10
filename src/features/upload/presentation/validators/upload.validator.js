import Joi from "joi";
import { UploadPurpose } from "../../domain/constants/upload-purpose.js";

export const uploadSchema = Joi.object({
  purpose: Joi.string()
    .valid(...Object.values(UploadPurpose))
    .required(),

  organizationId: Joi.string().uuid().allow(null, ""),

  projectId: Joi.string().uuid().allow(null, ""),

  sourceUrl: Joi.string().uri().allow(null, ""),

  metadata: Joi.object().allow(null),
});
