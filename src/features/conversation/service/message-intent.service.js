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
  // Telugu script greetings
  "నమస్కారం",
  "నమస్తే",
  "బాగున్నారా",
  "మీరు ఎలా ఉన్నారు",
  "ఎలా ఉన్నారు",
  // Romanized Telugu greetings
  "namaskaram",
  "namaste",
  "bagunnara",
  "meeru ela unnaru",
  "ela unnaru",
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

/**
 * Patterns indicating future intentions, postponing, or reconnecting later,
 * which must NOT trigger immediate human agent handover.
 */
const POSTPONE_OR_FUTURE_PATTERNS = [
  /\b(later|tomorrow|next\s+week|next\s+month|next\s+time|some\s+other\s+time|another\s+time|tonight|after\s+some\s+time|afterwards|reconnect|soon)\b/i,
  /\b(will|shall|can|let\s*me|i['’]?ll)\s+(connect|contact|reach\s+out|talk|speak|chat)\s+(with\s+you|to\s+you|later|tomorrow|soon)\b/i,
  /\b(connect|talk|speak|chat)\s+(with\s+you|to\s+you)\s+(later|tomorrow|soon|next\s+week)\b/i,
];

/**
 * Patterns indicating technical connectivity, account integration, hardware/API/network
 * questions, or system capability questions that must NOT trigger human agent handover.
 */
const TECHNICAL_OR_CAPABILITY_PATTERNS = [
  // Connecting technical entities (accounts, APIs, apps, DBs, devices, websites, etc.)
  /\b(connect|connecting|link|linking|integrate|integrating)\b.*\b(account|app|application|api|website|web|site|db|database|server|wifi|internet|bluetooth|device|printer|domain|wallet|webhook|endpoint|service|phone|mobile)\b/i,
  /\b(how\s+to|how\s+do\s+i|can\s+i|unable\s+to|failed\s+to)\s+(connect|link|integrate)\s+(my\s+|the\s+|this\s+|an?\s+)?(account|app|application|api|website|web|site|db|database|server|wifi|internet|bluetooth|device|printer|domain|wallet|webhook|endpoint|service|phone|mobile)\b/i,
  // Capability inquiries ("Do you support X?")
  /\b(do\s+you|does\s+(it|this|your\s+platform|the\s+system)|can\s+you)\s+support\b/i,
  // Product definition inquiries ("What is an AI agent?")
  /\bwhat\s+is\s+(an?|the)\s+(ai\s+|virtual\s+)?(agent|bot|assistant)\b/i,
];

/**
 * Explicit, positive intent patterns for requesting immediate human agent handover.
 */
const POSITIVE_HANDOVER_PATTERNS = [
  // 1. Explicit requests for a human, real person, or live agent
  /\b(talk|speak|chat|connect|transfer|switch|escalate|route|reach)\s+(me\s+)?(to|with)?\s*(a\s+|an\s+|the\s+)?(real\s+person|human(\s+being)?|live\s+agent|real\s+human|live\s+person|human\s+agent|human\s+support|human\s+rep|human\s+representative|human\s+operator)\b/i,
  /\b(want|need|like|prefer|wish|can\s+i|could\s+i|let\s+me)\s+(to\s+)?(talk|speak|chat|connect)\s+(to|with)?\s*(a\s+|an\s+|the\s+)?(real\s+person|human(\s+being)?|live\s+agent|real\s+human|live\s+person|human\s+agent|human\s+support|human\s+rep|human\s+representative|human\s+operator)\b/i,
  /\b(i\s+want|i\s+need|get\s+me|give\s+me)\s+(a\s+)?(human|real\s+person|live\s+agent|human\s+agent)\b/i,
  /\b(human\s+agent|live\s+agent|real\s+person)\s+(please|now|immediately|help|assist)\b/i,

  // 2. Explicit support team / customer care / executive / team escalation
  // (e.g. "need to talk with your team", "talk with team", "connect with team", "talk to your team")
  /\b(want|need|wish|like|prefer|can\s+i|could\s+i|let\s+me|i\s+want|i\s+need|please)\s+(to\s+)?(talk|speak|chat|connect|reach(\s+out)?|contact|get\s+in\s+touch)\s+(to|with)?\s*(your\s+|the\s+|our\s+|a\s+|an\s+)?(team|team\s*member|support\s*(team|agent|staff|rep|representative|person|executive)|customer\s+support(\s+team)?|customer\s+care(\s+team)?|helpdesk(\s+team)?|executive|representative|rep|agent|staff)\b/i,
  /\b(talk|speak|chat|connect)\s+(to|with)\s*(your\s+|the\s+|our\s+|a\s+|an\s+)?(team|team\s*member|support\s*(team|agent|staff|rep|representative|person|executive)|customer\s+support(\s+team)?|customer\s+care(\s+team)?|helpdesk(\s+team)?|executive|representative|rep|agent|staff)\b/i,
  /\b(transfer|connect|switch|escalate|route|reach)\s+(me\s+|this\s+(chat|conversation)\s+)?(to|with)\s*(your\s+|the\s+|our\s+|a\s+|an\s+)?(team|team\s*member|support\s*(team|agent|staff|rep|representative|person|executive)|customer\s+support(\s+team)?|customer\s+care(\s+team)?|helpdesk(\s+team)?|live\s+support|agent|executive|representative)\b/i,
  /\b(contact|reach(\s+out\s+to)?|get\s+in\s+touch\s+with)\s+(your\s+|the\s+|our\s+)?(team|team\s*member|support\s*(team|staff|agent|rep)|customer\s+care|helpdesk)\b/i,
  /\b(can|could|would)\s+(a\s+)?(support|customer\s+care|helpdesk|team)\s+(representative|agent|executive|person|member)\s+(help|assist|talk\s+to|speak\s+with)\b/i,
  /\b(customer\s*care|support\s*care)\b/i,

  // 3. Explicit handover / handoff action commands
  /\b(hand\s*over|hand\s*off|take\s*over)\s+(this\s+(chat|conversation)\s+)?(to\s+)?(a\s+|an\s+|the\s+)?(human|agent|person|representative|executive|support|real\s+person|team)\b/i,
  /\b(request|need|want)\s+(human|agent|live|team)\s+(handoff|handover|escalation)\b/i,

  // 4. Multilingual: Telugu script
  /((మానవ|హ్యూమన్)\s*ఏజెంట్|సపోర్ట్\s*టీమ్|(మీ\s*)?టీమ్|సపోర్ట్\s*ఏజెంట్|రియల్\s*పర్సన్).*(మాట్లాడాలి|కనెక్ట్\s*చేయండి|బదిలీ\s*చేయండి)/i,
  /(మాట్లాడాలి|కనెక్ట్\s*చేయండి).*((మానవ|హ్యూమన్)\s*ఏజెంట్|సపోర్ట్\s*టీమ్|(మీ\s*)?టీమ్|సపోర్ట్\s*ఏజెంట్)/i,

  // 5. Multilingual: Romanized Telugu
  /\b(human\s*agent|support\s*team|team|support\s*agent|real\s*person)\s*(tho|to|ki)\s*(matladali|connect\s*cheyandi|transfer\s*cheyandi)\b/i,
  /\b(matladali|connect\s*cheyandi)\s*(human\s*agent|support\s*team|team|support\s*agent|real\s*person)\b/i,
];

// 6. Intent patterns for returning to AI / resuming chatbot from human handover
const RETURN_TO_AI_PATTERNS = [
  /\b(back\s+to\s+(ai|bot|assistant)|return\s+to\s+(ai|bot|assistant)|switch\s+(back\s+)?to\s+(ai|bot|assistant)|talk\s+to\s+(ai|bot|assistant)|chat\s+with\s+(ai|bot|assistant))\b/i,
  /\b(restart\s+chat|resume\s+(chat|ai|bot)|start\s+over|cancel\s+(support|handover|handoff))\b/i,
  /\b(ai\s+tho\s+matladali|ai\s+ki\s+marandi|bot\s+tho\s+matladali)\b/i,
];

export function isReturnToAiIntent(message) {
  if (typeof message !== "string" || !message.trim()) {
    return false;
  }
  const text = message.trim();
  return RETURN_TO_AI_PATTERNS.some((pattern) => pattern.test(text));
}

export function isHumanHandoverIntent(message) {
  if (typeof message !== "string" || !message.trim()) {
    return false;
  }

  const text = message.trim();

  // 1. If user indicates future intent or postponing to later, do NOT trigger immediate handoff
  if (POSTPONE_OR_FUTURE_PATTERNS.some((pattern) => pattern.test(text))) {
    return false;
  }

  // 2. If user is asking about technical connectivity (APIs, accounts, devices) or product capabilities, do NOT trigger handoff
  if (TECHNICAL_OR_CAPABILITY_PATTERNS.some((pattern) => pattern.test(text))) {
    return false;
  }

  // 3. Must match an explicit, positive human support intent pattern
  return POSITIVE_HANDOVER_PATTERNS.some((pattern) => pattern.test(text));
}
