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

const HANDOVER_PATTERNS = [
  /\b(human|agent|support|executive|representative|operator|person|staff|team\s*member|customer\s*care|helpdesk)\b/i,
  /\b(talk|speak|connect|chat|transfer|escalate)\s+(to|with|me|us)?\s*(a|an|the|some)?\s*(human|agent|person|someone|team|staff|member|executive|support|representative)\b/i,
  /\b(connect\s+with|connect\s+me|connect\s+to)\b/i,
  /\b(real\s*person|live\s*agent|live\s*person|human\s*being)\b/i,
  /\b(hand\s*over|handover|take\s*over|takeover)\b/i,
];

export function isHumanHandoverIntent(message) {
  if (typeof message !== "string" || !message.trim()) {
    return false;
  }
  const text = message.trim();
  return HANDOVER_PATTERNS.some((pattern) => pattern.test(text));
}
