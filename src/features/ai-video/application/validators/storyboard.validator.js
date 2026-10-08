import { AppError } from "../../../../common/errors/AppError.js";

/**
 * Validates and normalizes storyboard JSON outputs from AI providers.
 */
export class StoryboardValidator {
  /**
   * Cleans JSON strings that may be wrapped in Markdown code blocks.
   * @param {string} rawText 
   * @returns {string}
   */
  static cleanJsonText(rawText) {
    if (typeof rawText !== "string") return "";
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "").trim();
    }
    return cleaned;
  }

  /**
   * Unwraps nested wrapper properties (storyboard, data, result, payload, response)
   * @param {Object} data 
   * @returns {Object}
   */
  static unwrapData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return data;
    if (Array.isArray(data.scenes)) return data;

    if (data.storyboard && typeof data.storyboard === "object" && Array.isArray(data.storyboard.scenes)) {
      return data.storyboard;
    }
    if (data.data && typeof data.data === "object") {
      if (Array.isArray(data.data.scenes)) return data.data;
      if (data.data.storyboard && typeof data.data.storyboard === "object" && Array.isArray(data.data.storyboard.scenes)) {
        return data.data.storyboard;
      }
    }
    if (data.result && typeof data.result === "object" && Array.isArray(data.result.scenes)) {
      return data.result;
    }
    if (data.payload && typeof data.payload === "object" && Array.isArray(data.payload.scenes)) {
      return data.payload;
    }
    if (data.response && typeof data.response === "object" && Array.isArray(data.response.scenes)) {
      return data.response;
    }
    return data;
  }

  /**
   * Validates raw JSON object or string against storyboard schema.
   * @param {Object|string} input 
   * @param {number} [expectedDuration] Optional target project duration (e.g. 30)
   * @returns {Object} Normalized storyboard object
   */
  static validate(input, expectedDuration = null) {
    let data = input;
    if (typeof input === "string") {
      try {
        const cleaned = this.cleanJsonText(input);
        data = JSON.parse(cleaned);
      } catch (err) {
        throw new AppError(
          `Failed to parse storyboard JSON: ${err.message}`,
          422,
          "AI_DIRECTOR_INVALID_RESPONSE"
        );
      }
    }

    data = this.unwrapData(data);

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new AppError(
        "Storyboard response must be a valid JSON object",
        422,
        "AI_DIRECTOR_INVALID_RESPONSE"
      );
    }

    if (!Array.isArray(data.scenes) || data.scenes.length === 0) {
      throw new AppError(
        "Storyboard must contain a non-empty 'scenes' array",
        422,
        "AI_DIRECTOR_INVALID_RESPONSE"
      );
    }

    const validAspectRatios = ["9:16", "16:9", "1:1"];
    const validLanguages = ["te", "hi", "en", "ta", "kn", "ml"];

    const normalized = {
      title: typeof data.title === "string" ? data.title.trim() : "Untitled Video",
      synopsis: typeof data.synopsis === "string" ? data.synopsis.trim() : "",
      language: validLanguages.includes(data.language) ? data.language : "en",
      aspectRatio: validAspectRatios.includes(data.aspectRatio) ? data.aspectRatio : "9:16",
      style: typeof data.style === "string" ? data.style.trim() : "cartoon",
      duration: typeof data.duration === "number" && data.duration > 0 ? data.duration : (expectedDuration || 30),
      characters: [],
      scenes: [],
    };

    if (Array.isArray(data.characters)) {
      normalized.characters = data.characters.map((char, index) => {
        if (!char || typeof char !== "object") {
          throw new AppError(
            `Invalid character entry at index ${index}`,
            422,
            "AI_DIRECTOR_INVALID_RESPONSE"
          );
        }
        return {
          name: typeof char.name === "string" && char.name.trim() ? char.name.trim() : `Character ${index + 1}`,
          gender: typeof char.gender === "string" ? char.gender.trim() : "unspecified",
          prompt: typeof char.prompt === "string" ? char.prompt.trim() : "",
          voice: typeof char.voice === "string" ? char.voice.trim() : "default",
        };
      });
    }

    let calculatedTotalDuration = 0;
    let currentTimelineOffset = 0;

    normalized.scenes = data.scenes.map((scene, index) => {
      if (!scene || typeof scene !== "object") {
        throw new AppError(
          `Invalid scene entry at index ${index}`,
          422,
          "AI_DIRECTOR_INVALID_RESPONSE"
        );
      }

      const sceneNumber = typeof scene.sceneNumber === "number" ? scene.sceneNumber : index + 1;
      const duration = typeof scene.duration === "number" && scene.duration > 0 ? scene.duration : 5;

      if (duration <= 0) {
        throw new AppError(
          `Scene ${sceneNumber} has an invalid duration (${duration}s)`,
          422,
          "AI_DIRECTOR_INVALID_RESPONSE"
        );
      }

      // Check startTime and endTime if provided
      let startTime = typeof scene.startTime === "number" ? scene.startTime : currentTimelineOffset;
      let endTime = typeof scene.endTime === "number" ? scene.endTime : startTime + duration;

      if (startTime < 0 || endTime <= startTime) {
        throw new AppError(
          `Scene ${sceneNumber} has invalid timeline bounds (startTime: ${startTime}, endTime: ${endTime})`,
          422,
          "AI_DIRECTOR_INVALID_RESPONSE"
        );
      }

      if (startTime < currentTimelineOffset) {
        throw new AppError(
          `Scene ${sceneNumber} overlaps with previous scene in timeline`,
          422,
          "AI_DIRECTOR_INVALID_RESPONSE"
        );
      }

      currentTimelineOffset = endTime;
      calculatedTotalDuration += (endTime - startTime);

      return {
        sceneNumber,
        startTime,
        endTime,
        visualPrompt: typeof scene.visualPrompt === "string" ? scene.visualPrompt.trim() : "",
        motionPrompt: typeof scene.motionPrompt === "string" ? scene.motionPrompt.trim() : "",
        dialogue: typeof scene.dialogue === "string" ? scene.dialogue.trim() : "",
        speaker: typeof scene.speaker === "string" ? scene.speaker.trim() : "Narrator",
        duration: endTime - startTime,
        characterNames: Array.isArray(scene.characterNames) ? scene.characterNames.filter(c => typeof c === "string") : [],
      };
    });

    if (normalized.duration === 0) {
      normalized.duration = calculatedTotalDuration;
    }

    if (expectedDuration && expectedDuration > 0) {
      // If single scene with default duration was provided, adjust it to match target project duration
      if (normalized.scenes.length === 1 && calculatedTotalDuration !== expectedDuration) {
        normalized.scenes[0].duration = expectedDuration;
        normalized.scenes[0].endTime = expectedDuration;
        calculatedTotalDuration = expectedDuration;
        normalized.duration = expectedDuration;
      }

      const toleranceSec = 5;
      if (Math.abs(calculatedTotalDuration - expectedDuration) > toleranceSec) {
        throw new AppError(
          `Total scene duration (${calculatedTotalDuration}s) deviates beyond tolerance from requested project duration (${expectedDuration}s)`,
          422,
          "AI_DIRECTOR_INVALID_RESPONSE"
        );
      }
    }

    return normalized;
  }
}
