/**
 * AI Director Language Enforcement Helper
 * Provides dynamic system prompt instructions and post-generation validation for multi-lingual video scripts.
 */

export const LANGUAGE_CONFIG = {
  te: {
    code: "te",
    name: "Telugu",
    scriptName: "Telugu script",
    scriptRegex: /[\u0C00-\u0C7F]/,
    instruction:
      "Spoken dialogue and voiceover/narration MUST be written in natural Telugu script. Technical words (e.g. AI, API, Flutter, Kotlin, bug, developer), character names, and visual descriptions may remain in English.",
  },
  hi: {
    code: "hi",
    name: "Hindi",
    scriptName: "Devanagari script",
    scriptRegex: /[\u0900-\u097F]/,
    instruction:
      "Spoken dialogue and voiceover/narration MUST be written in natural Hindi using Devanagari script. Technical words, character names, and visual descriptions may remain in English.",
  },
  ta: {
    code: "ta",
    name: "Tamil",
    scriptName: "Tamil script",
    scriptRegex: /[\u0B80-\u0BFF]/,
    instruction:
      "Spoken dialogue and voiceover/narration MUST be written in natural Tamil script. Technical words, character names, and visual descriptions may remain in English.",
  },
  kn: {
    code: "kn",
    name: "Kannada",
    scriptName: "Kannada script",
    scriptRegex: /[\u0C80-\u0CFF]/,
    instruction:
      "Spoken dialogue and voiceover/narration MUST be written in natural Kannada script. Technical words, character names, and visual descriptions may remain in English.",
  },
  ml: {
    code: "ml",
    name: "Malayalam",
    scriptName: "Malayalam script",
    scriptRegex: /[\u0D00-\u0D7F]/,
    instruction:
      "Spoken dialogue and voiceover/narration MUST be written in natural Malayalam script. Technical words, character names, and visual descriptions may remain in English.",
  },
  en: {
    code: "en",
    name: "English",
    scriptName: "English",
    scriptRegex: null,
    instruction: "Spoken dialogue and narration MUST be written in natural English.",
  },
};

/**
 * Returns dynamic language enforcement instructions for system prompts.
 * @param {string} langCode - Language code (te, hi, en, ta, kn, ml, etc.)
 * @returns {string} Formatted prompt instruction block
 */
export function getLanguageInstruction(langCode = "en") {
  const code = (langCode || "en").toLowerCase();
  const config = LANGUAGE_CONFIG[code];

  const name = config?.name || langCode;
  const instruction =
    config?.instruction ||
    `Spoken dialogue and narration MUST be written in natural ${name} language.`;

  return `LANGUAGE REQUIREMENT IS MANDATORY.
The project's selected language is ${name} (${code}).

${instruction}

Do not output English dialogue when the selected language is Telugu, Hindi, Tamil, Kannada, or Malayalam.
Technical words, product names, character names, programming terms, and commonly used English words (e.g., AI, API, Flutter, bug, developer) may remain in English when naturally used by speakers of ${name}.
Visual descriptions are not subject to this spoken-language restriction and may remain in English.`;
}

/**
 * Validates whether the generated text content satisfies the selected language requirements.
 * Focuses on spoken dialogue / voiceover text.
 * Returns true if valid, false if purely English when non-English target language requested.
 *
 * @param {string|object} content - Extracted text content or parsed storyboard object
 * @param {string} langCode - Target language code
 * @returns {boolean} True if content satisfies language requirement
 */
export function validateSpokenLanguage(content, langCode = "en") {
  const code = (langCode || "en").toLowerCase();
  const config = LANGUAGE_CONFIG[code];

  // English always satisfies
  if (!config || !config.scriptRegex) {
    return true;
  }

  // Extract spoken text from content (excluding visual Prompts)
  let spokenText = "";

  if (typeof content === "string") {
    // If it's a JSON string, try to parse to extract dialogue/voiceover
    try {
      const parsed = JSON.parse(content);
      spokenText = extractSpokenTextFromObject(parsed);
    } catch {
      spokenText = content;
    }
  } else if (typeof content === "object" && content !== null) {
    spokenText = extractSpokenTextFromObject(content);
  }

  if (!spokenText.trim()) {
    return true;
  }

  // Check if target script characters exist
  const hasTargetScript = config.scriptRegex.test(spokenText);
  if (hasTargetScript) {
    return true;
  }

  // If 0 target script characters exist, check if spokenText is English conversational text
  // Common English conversational words
  const EnglishConversationalRegex =
    /\b(the|is|are|was|were|you|your|we|they|this|that|here|there|have|has|had|with|for|about|hello|welcome|think|thinks|knows|everything|another|great|help|brother|friend|today|going|want|will|can|should|could|would)\b/i;

  const hasConversationalEnglish = EnglishConversationalRegex.test(spokenText);

  // If purely conversational English sentences with no target script -> language mismatch!
  if (!hasTargetScript && hasConversationalEnglish) {
    return false;
  }

  return true;
}

/**
 * Helper to extract dialogue and voiceover text from structured objects, ignoring visual Prompts.
 */
function extractSpokenTextFromObject(obj) {
  if (!obj || typeof obj !== "object") return "";

  const spokenParts = [];

  if (Array.isArray(obj.scenes)) {
    for (const scene of obj.scenes) {
      if (typeof scene.dialogue === "string") {
        spokenParts.push(scene.dialogue);
      } else if (Array.isArray(scene.dialogue)) {
        for (const d of scene.dialogue) {
          if (typeof d === "string") spokenParts.push(d);
          else if (d && typeof d.text === "string") spokenParts.push(d.text);
        }
      }
      if (typeof scene.voiceover === "string") spokenParts.push(scene.voiceover);
      if (typeof scene.narration === "string") spokenParts.push(scene.narration);
    }
  }

  if (typeof obj.dialogue === "string") spokenParts.push(obj.dialogue);
  if (typeof obj.voiceover === "string") spokenParts.push(obj.voiceover);
  if (typeof obj.script === "string") spokenParts.push(obj.script);

  if (spokenParts.length === 0) {
    // Fallback to stringified object
    return JSON.stringify(obj);
  }

  return spokenParts.join(" ");
}
