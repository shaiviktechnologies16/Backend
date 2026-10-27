import test from "node:test";
import assert from "node:assert/strict";
import { AddNemotronModelsAndFallbackConfigs1730001500000 } from "./1730001500000-add-nemotron-models-and-fallback-configs.js";

test("AddNemotronModelsAndFallbackConfigs1730001500000: up() and down() execute correctly", async () => {
  const executedQueries = [];
  const mockQueryRunner = {
    query: async (sql, params = []) => {
      executedQueries.push({ sql: sql.trim(), params });
      // Return empty array for existence checks
      return [];
    },
  };

  const migration = new AddNemotronModelsAndFallbackConfigs1730001500000();

  // Test up()
  await migration.up(mockQueryRunner);
  assert.ok(executedQueries.length >= 10);

  // Verify models are inserted
  const insertModelQueries = executedQueries.filter((q) =>
    q.sql.includes("INSERT INTO ai_models"),
  );
  assert.equal(insertModelQueries.length, 4);

  // Verify organization access is granted
  const orgAccessQuery = executedQueries.find((q) =>
    q.sql.includes("INSERT INTO organization_model_access"),
  );
  assert.ok(orgAccessQuery);

  // Verify platform configs are inserted
  const insertConfigQueries = executedQueries.filter((q) =>
    q.sql.includes("INSERT INTO platform_configs"),
  );
  assert.equal(insertConfigQueries.length, 4);

  // Test down()
  executedQueries.length = 0;
  await migration.down(mockQueryRunner);
  assert.equal(executedQueries.length, 2);
});

