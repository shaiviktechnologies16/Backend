import test from "node:test";
import assert from "node:assert/strict";
import { ModelCostCalculatorService } from "./model-cost-calculator.service.js";

test("ModelCostCalculatorService calculates cost accurately for gpt-4o-mini", () => {
  const calculator = new ModelCostCalculatorService();

  // gpt-4o-mini: $0.15 / 1M input, $0.60 / 1M output
  // 1,000,000 input tokens = $0.15
  // 1,000,000 output tokens = $0.60
  // Total = $0.75
  const cost = calculator.calculateCost({
    modelName: "gpt-4o-mini",
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
  });

  assert.equal(cost, 0.75);
});

test("ModelCostCalculatorService returns $0.00 cost for local Ollama models", () => {
  const calculator = new ModelCostCalculatorService();

  const cost = calculator.calculateCost({
    modelName: "qwen3:8b",
    inputTokens: 500_000,
    outputTokens: 500_000,
  });

  assert.equal(cost, 0);
});
