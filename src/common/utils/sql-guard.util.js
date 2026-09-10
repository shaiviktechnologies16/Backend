export const sanitizeSqlIdentifierName = (columnNameString) => {
  if (!columnNameString || typeof columnNameString !== "string") {
    return "created_at";
  }

  const trimmedColumnName = columnNameString.trim();

  if (!/^[a-zA-Z0-9_]+$/.test(trimmedColumnName)) {
    throw new Error("INVALID_SQL_IDENTIFIER");
  }

  return trimmedColumnName;
};

export const validateSqlSortOrderDirection = (orderDirectionString) => {
  if (!orderDirectionString || typeof orderDirectionString !== "string") {
    return "DESC";
  }

  const normalizedOrderDirectionUpper = orderDirectionString
    .trim()
    .toUpperCase();

  if (
    normalizedOrderDirectionUpper === "ASC" ||
    normalizedOrderDirectionUpper === "ASCENDING"
  ) {
    return "ASC";
  }

  if (
    normalizedOrderDirectionUpper === "DESC" ||
    normalizedOrderDirectionUpper === "DESCENDING"
  ) {
    return "DESC";
  }

  return "DESC";
};

export const detectSqlInjectionPattern = (inputStringValue) => {
  if (!inputStringValue || typeof inputStringValue !== "string") {
    return false;
  }

  const highRiskSqlInjectionRegexPatternsList = [
    /(\b(select|insert|update|delete|drop|union|truncate|alter|create|exec|execute)\b)/i,
    /(--|\/\*|\*\/|;|::)/i,
    /(\bOR\b\s+['"]?\s*1\s*['"]?\s*=\s*['"]?\s*1)/i,
    /(pg_sleep|waitfor delay|benchmark)/i,
  ];

  for (const regexPatternItem of highRiskSqlInjectionRegexPatternsList) {
    if (regexPatternItem.test(inputStringValue)) {
      return true;
    }
  }

  return false;
};
