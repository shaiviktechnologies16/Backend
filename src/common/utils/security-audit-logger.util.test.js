import test from "node:test";
import assert from "node:assert/strict";
import {
  logSecurityAuditEvent,
  redactSensitiveObjectProperties,
  SecurityEventTypes,
  SecuritySeverityLevels,
} from "./security-audit-logger.util.js";

test("redactSensitiveObjectProperties redacts passwords and secrets from log payloads", () => {
  const samplePayloadWithSecrets = {
    userEmail: "admin@shaivik.ai",
    password: "SuperSecretPassword123!",
    nestedConfig: {
      jwtTokenSecret: "jwt_secret_token_123",
      publicName: "Platform Admin",
    },
  };

  const sanitizedResult = redactSensitiveObjectProperties(
    samplePayloadWithSecrets,
  );

  assert.equal(sanitizedResult.userEmail, "admin@shaivik.ai");
  assert.equal(sanitizedResult.password, "[REDACTED_SENSITIVE_DATA]");
  assert.equal(
    sanitizedResult.nestedConfig.jwtTokenSecret,
    "[REDACTED_SENSITIVE_DATA]",
  );
  assert.equal(sanitizedResult.nestedConfig.publicName, "Platform Admin");
});

test("logSecurityAuditEvent formats structured SECURITY_AUDIT payload", () => {
  const auditLogPayloadResult = logSecurityAuditEvent({
    eventTypeString: SecurityEventTypes.AUTH_RATE_LIMIT_EXCEEDED,
    severityLevelString: SecuritySeverityLevels.HIGH,
    clientIpAddressString: "192.168.1.10",
    requestEndpointString: "/api/auth/login",
    incidentDetailsObject: {
      attemptCountNumber: 6,
      password: "secretPassword",
    },
  });

  assert.equal(auditLogPayloadResult.logCategory, "SECURITY_AUDIT");
  assert.equal(auditLogPayloadResult.eventType, "AUTH_RATE_LIMIT_EXCEEDED");
  assert.equal(auditLogPayloadResult.severity, "HIGH");
  assert.equal(
    auditLogPayloadResult.details.password,
    "[REDACTED_SENSITIVE_DATA]",
  );
  assert.equal(auditLogPayloadResult.details.attemptCountNumber, 6);
});
