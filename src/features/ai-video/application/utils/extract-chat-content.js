/**
 * Phase 5.4 Backend Normalization Layer for AI Director Script Responses.
 *
 * Normalizes provider outputs (plain strings, JSON strings, nested wrappers, or structured objects)
 * into a stable, clean canonical script text representation.
 *
 * Supported Inputs:
 * 1. Plain string script
 * 2. { scriptContent: string }
 * 3. { script: string }
 * 4. { content: string }
 * 5. { text: string }
 * 6. Markdown-wrapped JSON (```json ... ```)
 * 7. Structured script/storyboard objects ({ title, hook, scenes, ... })
 *
 * Rejects:
 * - null / undefined
 * - empty strings or whitespace-only strings
 * - malformed / unexpected objects with no recognized script structure
 * - primitives (numbers, booleans, functions)
 *
 * @param {unknown} input
 * @returns {string|null} Canonical normalized string, or null if invalid/unsupported
 */
export function normalizeScriptContent(input) {
  if (input === null || input === undefined) {
    return null;
  }

  let value = input;

  // 1. Unwrap provider response objects if nested
  if (typeof value === "object" && value !== null) {
    // Ollama provider: { message: { content: "..." } }
    if (value.message && typeof value.message === "object" && value.message.content !== undefined) {
      value = value.message.content;
    }
    // OpenAI provider: { choices: [{ message: { content: "..." } }] }
    else if (Array.isArray(value.choices) && value.choices.length > 0 && value.choices[0]?.message?.content !== undefined) {
      value = value.choices[0].message.content;
    }
    // Explicit wrapper properties
    else if (value.scriptContent !== undefined) {
      value = value.scriptContent;
    }
    else if (value.script !== undefined) {
      value = value.script;
    }
    else if (value.content !== undefined) {
      value = value.content;
    }
    else if (value.text !== undefined) {
      value = value.text;
    }
  }

  // If value is a Markdown fenced code block string (```json ... ``` or ``` ... ```), strip fences
  if (typeof value === "string") {
    let trimmed = value.trim();
    if (trimmed.startsWith("```")) {
      trimmed = trimmed.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "").trim();
      value = trimmed;
    }
  }

  // 2. If value is still an object (already-parsed structured script object)
  if (typeof value === "object" && value !== null) {
    const recognizedKeys = [
      "title",
      "hook",
      "scenes",
      "script",
      "scriptcontent",
      "text",
      "outline",
      "synopsis",
      "body",
      "dialogue",
      "characters",
      "storyboard",
    ];
    const hasRecognizedKey = Object.keys(value).some((key) =>
      recognizedKeys.includes(key.toLowerCase())
    );

    if (!hasRecognizedKey) {
      return null;
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return null;
    }
  }

  // 3. If value is a string
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    // Check if it's a JSON string representing a structured object or array
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === "object" && parsed !== null) {
          if (typeof parsed.scriptContent === "string" && parsed.scriptContent.trim()) {
            return parsed.scriptContent.trim();
          }
          if (typeof parsed.script === "string" && parsed.script.trim()) {
            return parsed.script.trim();
          }
          if (typeof parsed.content === "string" && parsed.content.trim()) {
            return parsed.content.trim();
          }
          return JSON.stringify(parsed, null, 2);
        }
      } catch {
        // Not valid JSON, treat as plain string
      }
    }

    return trimmed;
  }

  return null;
}

// Alias for backwards compatibility
export const extractChatContent = normalizeScriptContent;
