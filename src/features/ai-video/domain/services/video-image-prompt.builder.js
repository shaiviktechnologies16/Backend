/**
 * Service for building structured, high-quality image generation prompts from scene and project metadata.
 */
export class VideoImagePromptBuilder {
  /**
   * Constructs an optimized text prompt for image generation providers.
   */
  static buildPrompt({
    visualPrompt,
    projectPrompt = "",
    projectName = "",
    style = "3d-cartoon",
    aspectRatio = "9:16",
    characters = [],
    referenceImageUrl = null,
    referenceImages = [],
  }) {
    const baseSubject = (
      visualPrompt ||
      projectPrompt ||
      projectName ||
      "A high quality scene"
    ).trim();

    // Style descriptor mapping
    let styleText = "";
    switch (style.toLowerCase()) {
      case "3d-cartoon":
      case "cartoon":
        styleText =
          "3D Pixar/Disney style cartoon animation, highly detailed render, vibrant colors, expressive features, clean lighting.";
        break;
      case "realistic":
      case "cinematic":
        styleText =
          "Photorealistic cinematic 8k image, detailed textures, natural lighting, professional photography.";
        break;
      case "anime":
        styleText =
          "Modern anime aesthetic, crisp linework, vibrant cell shading, detailed environment.";
        break;
      default:
        styleText = `${style} artistic style, high quality render.`;
        break;
    }

    // Aspect ratio framing guidance
    let framingText = "";
    if (aspectRatio === "9:16") {
      framingText =
        "Vertical 9:16 format, mobile vertical composition, perfectly framed centered subject.";
    } else if (aspectRatio === "16:9") {
      framingText = "Widescreen 16:9 cinematic framing.";
    } else if (aspectRatio === "1:1") {
      framingText = "Square 1:1 balanced framing.";
    }

    // Resolve all active reference images
    const activeRefImages = Array.isArray(referenceImages) && referenceImages.length > 0
      ? referenceImages
      : (referenceImageUrl ? [{ url: referenceImageUrl, characterName: "primary character" }] : []);

    // Character guidance
    let characterText = "";
    if (Array.isArray(characters) && characters.length > 0) {
      const charDetails = characters
        .map((c) => {
          const namePart = c.name ? `named ${c.name}` : "";
          const descPart = c.description ? `(appearance: ${c.description})` : "";
          const stylePart = c.style ? `in ${c.style} style` : "";
          const hasRef = Boolean(
            c.referenceImageUrl ||
            activeRefImages.some(r => r.characterId === c.id || (r.characterName && r.characterName.toLowerCase() === (c.name || '').toLowerCase()))
          );
          const refPart = hasRef ? "[Canonical Visual Identity Reference Active]" : "";
          return `Character ${namePart} ${descPart} ${stylePart} ${refPart}`.trim();
        })
        .join("; ");

      if (activeRefImages.length > 0) {
        characterText = `Featured characters: ${charDetails}. Enforce strict character identity continuity: preserve facial features, expressions, proportions, body structure, and clothing consistent with the provided reference images. Do not alter or redesign the established character appearances.`;
      } else {
        characterText = `Featured characters: ${charDetails}. Maintain consistent character design and appearance across scenes.`;
      }
    }

    // Reference images identity guidance (conceptual instructions; URLs excluded from prompt text)
    let referenceGuidance = "";
    if (activeRefImages.length > 1) {
      const namedList = activeRefImages
        .map((r) => r.characterName || "Character")
        .filter(Boolean)
        .join(" and ");
      referenceGuidance = `Multiple character reference images are provided corresponding to ${namedList}. Each reference image serves as the canonical visual benchmark for that respective character. Maintain distinct facial and physical identities for all characters matching their respective reference images.`;
    } else if (activeRefImages.length === 1) {
      const charName = activeRefImages[0].characterName ? `for ${activeRefImages[0].characterName}` : "";
      referenceGuidance = `A canonical character reference image is provided ${charName}. Use this reference image as the primary visual benchmark for subject identity, appearance, facial features, proportions, and styling.`;
    }

    // Combine all sections into prompt
    const parts = [baseSubject, characterText, referenceGuidance, styleText, framingText].filter(
      Boolean,
    );

    return parts.join(" ");
  }
}
