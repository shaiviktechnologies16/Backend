const SIMPLE_CONVERSATIONAL_MESSAGES = new Set([
  "hi",
  "hello",
  "hey",
  "thanks",
  "thank you",
  "good morning",
  "good afternoon",
  "good evening",
  "good night",
  "bye",
  "goodbye",
  "okay",
  "ok",
  "yes",
  "no",
  "how are you",
  "who are you",
]);

export function isSimpleConversationalMessage(message) {
  if (typeof message !== "string") {
    return false;
  }

  const normalized = message
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");

  return SIMPLE_CONVERSATIONAL_MESSAGES.has(normalized);
}
