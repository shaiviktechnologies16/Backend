import test from "node:test";
import assert from "node:assert/strict";
import { IndicF5Provider } from "./indicf5/indicf5.provider.js";

test("IndicF5Provider parses multi-worker pool URLs correctly", async () => {
  const mockConfigUseCase = {
    getValue: async () => "http://node1:8001, http://node2:8001",
  };

  const provider = new IndicF5Provider({
    getPlatformConfigUseCase: mockConfigUseCase,
  });

  const pool = await provider.getWorkerPool();
  assert.deepEqual(pool, ["http://node1:8001", "http://node2:8001"]);
});

test("IndicF5Provider selects worker with least active connections", () => {
  const provider = new IndicF5Provider({
    getPlatformConfigUseCase: { getValue: async () => "" },
  });

  const pool = ["http://node1:8001", "http://node2:8001", "http://node3:8001"];

  // Initially node1 selected
  assert.equal(provider.selectTargetWorker(pool), "http://node1:8001");

  // Increment jobs on node1
  provider.incrementWorkerJobs("http://node1:8001");
  assert.equal(provider.selectTargetWorker(pool), "http://node2:8001");

  // Increment jobs on node2
  provider.incrementWorkerJobs("http://node2:8001");
  assert.equal(provider.selectTargetWorker(pool), "http://node3:8001");

  // Decrement jobs on node1
  provider.decrementWorkerJobs("http://node1:8001");
  assert.equal(provider.selectTargetWorker(pool), "http://node1:8001");
});
