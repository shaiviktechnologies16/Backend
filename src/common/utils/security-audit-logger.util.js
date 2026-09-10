export const SecurityEventTypes = Object.freeze({
  AUTH_RATE_LIMIT_EXCEEDED: "AUTH_RATE_LIMIT_EXCEEDED",
  PROMPT_INJECTION_DETECTED: "PROMPT_INJECTION_DETECTED",
  DANGEROUS_FILE_UPLOAD_BLOCKED: "DANGEROUS_FILE_UPLOAD_BLOCKED",
  SSRF_ATTACK_BLOCKED: "SSRF_ATTACK_BLOCKED",
  FORGED_JWT_ATTEMPT_REJECTED: "FORGED_JWT_ATTEMPT_REJECTED",
  XSS_ATTACK_SANITIZED: "XSS_ATTACK_SANITIZED",
  SQL_INJECTION_BLOCKED: "SQL_INJECTION_BLOCKED",
});

export const SecuritySeverityLevels = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});

const sensitivePropertyKeysBlacklist = new Set([
  "password",
  "secret",
  "token",
  "authorization",
  "apikey",
  "jwt",
  "cookie",
]);

export const redactSensitiveObjectProperties = (targetObjectStructure) => {
  if (!targetObjectStructure || typeof targetObjectStructure !== "object") {
    return targetObjectStructure;
  }

  if (Array.isArray(targetObjectStructure)) {
    return targetObjectStructure.map((arrayItemElement) =>
      redactSensitiveObjectProperties(arrayItemElement),
    );
  }

  const sanitizedObjectResult = {};

  for (const objectPropertyKey of Object.keys(targetObjectStructure)) {
    const propertyKeyLower = objectPropertyKey.toLowerCase();
    let isSensitivePropertyKey = false;

    for (const sensitiveKeyItem of sensitivePropertyKeysBlacklist) {
      if (propertyKeyLower.includes(sensitiveKeyItem)) {
        isSensitivePropertyKey = true;
        break;
      }
    }

    if (isSensitivePropertyKey) {
      sanitizedObjectResult[objectPropertyKey] = "[REDACTED_SENSITIVE_DATA]";
    } else {
      sanitizedObjectResult[objectPropertyKey] =
        redactSensitiveObjectProperties(
          targetObjectStructure[objectPropertyKey],
        );
    }
  }

  return sanitizedObjectResult;
};

export const logSecurityAuditEvent = ({
  eventTypeString,
  severityLevelString = SecuritySeverityLevels.MEDIUM,
  clientIpAddressString = "0.0.0.0",
  requestEndpointString = "UNKNOWN_ENDPOINT",
  userIdString = null,
  incidentDetailsObject = {},
}) => {
  const sanitizedIncidentDetails = redactSensitiveObjectProperties(
    incidentDetailsObject,
  );

  const securityAuditEventPayload = {
    timestamp: new Date().toISOString(),
    logCategory: "SECURITY_AUDIT",
    eventType: eventTypeString,
    severity: severityLevelString,
    clientIpAddress: clientIpAddressString,
    requestEndpoint: requestEndpointString,
    userId: userIdString,
    details: sanitizedIncidentDetails,
  };

  console.warn(JSON.stringify(securityAuditEventPayload));
  return securityAuditEventPayload;
};
