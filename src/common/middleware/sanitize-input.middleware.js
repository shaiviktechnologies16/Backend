const sanitizeHtmlInputString = (inputStringValue) => {
  if (typeof inputStringValue !== "string") {
    return inputStringValue;
  }

  return inputStringValue
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript\s*:\s*/gi, "");
};

const sanitizeObjectStructureRecursively = (targetStructure) => {
  if (targetStructure === null || targetStructure === undefined) {
    return targetStructure;
  }

  if (typeof targetStructure === "string") {
    return sanitizeHtmlInputString(targetStructure);
  }

  if (Array.isArray(targetStructure)) {
    return targetStructure.map((arrayElementItem) =>
      sanitizeObjectStructureRecursively(arrayElementItem),
    );
  }

  if (typeof targetStructure === "object") {
    const sanitizedObjectResult = {};

    for (const objectPropertyKey of Object.keys(targetStructure)) {
      sanitizedObjectResult[objectPropertyKey] =
        sanitizeObjectStructureRecursively(targetStructure[objectPropertyKey]);
    }

    return sanitizedObjectResult;
  }

  return targetStructure;
};

export const sanitizeRequestBodyMiddleware = (request, response, next) => {
  try {
    if (request.body && typeof request.body === "object") {
      request.body = sanitizeObjectStructureRecursively(request.body);
    }

    if (request.query && typeof request.query === "object") {
      for (const queryParameterKey of Object.keys(request.query)) {
        request.query[queryParameterKey] = sanitizeObjectStructureRecursively(
          request.query[queryParameterKey],
        );
      }
    }

    if (request.params && typeof request.params === "object") {
      for (const routeParameterKey of Object.keys(request.params)) {
        request.params[routeParameterKey] = sanitizeObjectStructureRecursively(
          request.params[routeParameterKey],
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
