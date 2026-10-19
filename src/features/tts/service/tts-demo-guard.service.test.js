import test from "node:test";
import assert from "node:assert/strict";
import { TtsDemoGuardService } from "./tts-demo-guard.service.js";

test("TtsDemoGuardService rejects text exceeding 500 characters", () => {
  const guard = new TtsDemoGuardService({ maxCharacters: 500 });

  assert.throws(
    () => {
      guard.reserve("v-1", 501);
    },
    (err) => {
      assert.equal(err.code, "TEXT_TOO_LONG");
      assert.equal(err.statusCode, 400);
      return true;
    },
  );

  // Valid length <= 500 succeeds
  const reservation = guard.reserve("v-1", 450);
  assert.equal(reservation.reserved, true);
  guard.release("v-1", { success: true });
});

test("TtsDemoGuardService enforces per-visitor daily request limit", () => {
  const guard = new TtsDemoGuardService({ visitorDailyLimit: 2 });

  // 1st request
  guard.reserve("visitor-a", 100);
  guard.release("visitor-a", { success: true });

  // 2nd request
  guard.reserve("visitor-a", 100);
  guard.release("visitor-a", { success: true });

  // 3rd request from visitor-a should be rejected
  assert.throws(
    () => {
      guard.reserve("visitor-a", 100);
    },
    (err) => {
      assert.equal(err.code, "VISITOR_DAILY_LIMIT_EXCEEDED");
      assert.equal(err.statusCode, 429);
      return true;
    },
  );

  // Different visitor can still make requests
  const other = guard.reserve("visitor-b", 100);
  assert.equal(other.reserved, true);
  guard.release("visitor-b", { success: true });
});

test("TtsDemoGuardService enforces global daily request cap", () => {
  const guard = new TtsDemoGuardService({
    globalDailyLimit: 3,
    visitorDailyLimit: 10,
  });

  guard.reserve("v-1", 50);
  guard.release("v-1", { success: true });

  guard.reserve("v-2", 50);
  guard.release("v-2", { success: true });

  guard.reserve("v-3", 50);
  guard.release("v-3", { success: true });

  // Global cap reached
  assert.throws(
    () => {
      guard.reserve("v-4", 50);
    },
    (err) => {
      assert.equal(err.code, "GLOBAL_DAILY_LIMIT_EXCEEDED");
      assert.equal(err.statusCode, 429);
      return true;
    },
  );
});

test("TtsDemoGuardService enforces concurrency limit", () => {
  const guard = new TtsDemoGuardService({ maxConcurrency: 1 });

  // Reserve slot 1 (in-flight)
  guard.reserve("v-1", 100);

  // Slot 2 while slot 1 is still in-flight
  assert.throws(
    () => {
      guard.reserve("v-2", 100);
    },
    (err) => {
      assert.equal(err.code, "CONCURRENCY_LIMIT_REACHED");
      assert.equal(err.statusCode, 429);
      return true;
    },
  );

  // Release slot 1
  guard.release("v-1", { success: true });

  // Now slot 2 can proceed
  const slot2 = guard.reserve("v-2", 100);
  assert.equal(slot2.reserved, true);
  guard.release("v-2", { success: true });
});

test("TtsDemoGuardService marks provider quota exhausted and fails fast without retries", () => {
  const guard = new TtsDemoGuardService({});

  guard.reserve("v-1", 100);

  // Simulate OpenRouter 429 / free-models-per-day error
  const fakeError = new Error("Rate limit exceeded: free-models-per-day");
  fakeError.statusCode = 429;

  assert.equal(guard.isQuotaExhaustionError(fakeError), true);

  guard.release("v-1", {
    success: false,
    providerExhausted: true,
    error: fakeError,
  });

  // Next requests should immediately fail fast with PROVIDER_QUOTA_EXHAUSTED
  assert.throws(
    () => {
      guard.reserve("v-2", 50);
    },
    (err) => {
      assert.equal(err.code, "PROVIDER_QUOTA_EXHAUSTED");
      assert.equal(err.statusCode, 429);
      return true;
    },
  );

  const status = guard.getStatus("v-2");
  assert.equal(status.isAvailable, false);
  assert.equal(status.isProviderExhausted, true);
});

