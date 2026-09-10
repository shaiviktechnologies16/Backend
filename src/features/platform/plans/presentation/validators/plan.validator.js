export const createPlanValidator = (req, res, next) => {
  const { name, code } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_PLAN_NAME",
        message: "Plan name is required.",
      },
    });
  }

  if (!code || typeof code !== "string") {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_PLAN_CODE",
        message: "Plan code is required.",
      },
    });
  }

  next();
};

export const updatePlanValidator = (req, res, next) => {
  const {
    name,
    code,
    description,
    isActive,
    priceMonthly,
    priceYearly,
    currency,
  } = req.body;

  if (
    name === undefined &&
    code === undefined &&
    description === undefined &&
    isActive === undefined &&
    priceMonthly === undefined &&
    priceYearly === undefined &&
    currency === undefined
  ) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_PLAN_UPDATE",
        message: "At least one plan field is required.",
      },
    });
  }

  next();
};

export const updateUsageLimitValidator = (req, res, next) => {
  const allowedFields = [
    "maxProjects",
    "maxAgents",
    "maxKnowledgeBases",
    "maxKnowledgeDocuments",
    "monthlyAiCredits",
    "maxTeamMembers",
    "maxWhatsappConnections",
    "voiceAiMinutes",
    "requestsPerDay",
    "requestsPerMonth",
    "tokensPerDay",
    "tokensPerMonth",
    "conversationsPerDay",
    "conversationsPerMonth",
    "uniqueVisitorsPerDay",
    "uniqueVisitorsPerMonth",
    "messagesPerVisitorPerDay",
    "messagesPerVisitorPerMonth",
  ];

  const fields = Object.keys(req.body);

  if (fields.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_USAGE_LIMIT",
        message: "At least one usage limit is required.",
      },
    });
  }

  const invalidField = fields.find((field) => !allowedFields.includes(field));

  if (invalidField) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_USAGE_LIMIT_FIELD",
        message: `Invalid usage limit field: ${invalidField}.`,
      },
    });
  }

  for (const field of fields) {
    const value = req.body[field];

    if (value === null) {
      continue;
    }

    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_USAGE_LIMIT_VALUE",
          message: `${field} must be a non-negative integer or null.`,
        },
      });
    }
  }

  next();
};
