import assert from "node:assert/strict";
import { isSimpleConversationalMessage } from "./message-intent.service.js";

const simpleCases = ["Hi", "hi", "  HI  ", "Hello", "Thanks!", "Good morning"];

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

assert.equal(isSimpleConversationalMessage(""), false);

import { isHumanHandoverIntent } from "./message-intent.service.js";

const handoverCases = [
  "connect with your team member so i can talk with him",
  "I want to talk to a human",
  "connect me to an agent",
  "talk with team member",
  "speak with executive",
  "support care",
  "handover this chat to a real person",
];

for (const msg of handoverCases) {
  assert.equal(
    isHumanHandoverIntent(msg),
    true,
    `Expected handover intent: ${msg}`,
  );
}
