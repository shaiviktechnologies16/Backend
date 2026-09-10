import { ValidationError } from "../errors/ValidationError.js";

export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return next(
      new ValidationError(
        error.details.map((detail) => detail.message).join(", "),
      ),
    );
  }

  req.body = value;

  next();
};
