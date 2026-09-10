import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeSqlIdentifierName,
  validateSqlSortOrderDirection,
  detectSqlInjectionPattern,
} from "./sql-guard.util.js";

test("sanitizeSqlIdentifierName approves safe column names and rejects SQL injection attempts", () => {
  assert.equal(sanitizeSqlIdentifierName("created_at"), "created_at");
  assert.equal(sanitizeSqlIdentifierName("user_id"), "user_id");

  assert.throws(() => {
    sanitizeSqlIdentifierName("created_at; DROP TABLE users;--");
  });

  assert.throws(() => {
    sanitizeSqlIdentifierName("user_id UNION SELECT * FROM secret");
  });
});

test("validateSqlSortOrderDirection normalizes order directions to ASC or DESC", () => {
  assert.equal(validateSqlSortOrderDirection("asc"), "ASC");
  assert.equal(validateSqlSortOrderDirection("DESCENDING"), "DESC");
  assert.equal(
    validateSqlSortOrderDirection("invalid_order; DROP TABLE"),
    "DESC",
  );
});

test("detectSqlInjectionPattern detects high risk SQL injection patterns", () => {
  assert.equal(detectSqlInjectionPattern("' OR '1'='1"), true);
  assert.equal(
    detectSqlInjectionPattern("1 UNION SELECT NULL, version()--"),
    true,
  );
  assert.equal(detectSqlInjectionPattern("; DROP TABLE projects;--"), true);
  assert.equal(detectSqlInjectionPattern("John Doe"), false);
  assert.equal(detectSqlInjectionPattern("project_name_123"), false);
});
