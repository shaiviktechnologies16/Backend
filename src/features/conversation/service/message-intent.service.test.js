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
  "need to talk with your team",
  "talk with team",
  "connect with team",
  "need to talk with team",
  "talk with your team",
  "talk to your team",
  "connect with your team",
  "connect to your team",
  "can i talk to your team",
  "can i connect with your team",
  "can i connect with team",
  "let me talk with your team",
  "please connect me to your team",
  "reach out to your team",
  "contact your team",
  "team tho matladali",
];

for (const msg of handoverCases) {
  assert.equal(
    isHumanHandoverIntent(msg),
    true,
    `Expected handover intent: ${msg}`,
  );
}
