import assert from "node:assert/strict";
import { isSimpleConversationalMessage } from "./message-intent.service.js";

const simpleCases = [
  "Hi",
  "hi",
  "  HI  ",
  "Hello",
  "Thanks!",
  "Good morning",
];

const normalCases = [
  "Tell me about your services",
  "What is your pricing?",
  "Book a demo",
  "I need information about refunds",
  "Can you help me?",
  "Hi, what services do you provide?",
];

for (const message of simpleCases) {
  assert.equal(
    isSimpleConversationalMessage(message),
    true,
    `Expected simple: ${message}`,
  );
}

for (const message of normalCases) {
  assert.equal(
    isSimpleConversationalMessage(message),
    false,
    `Expected normal: ${message}`,
  );
}

assert.equal(isSimpleConversationalMessage(null), false);
assert.equal(isSimpleConversationalMessage(undefined), false);
assert.equal(isSimpleConversationalMessage(""), false);
