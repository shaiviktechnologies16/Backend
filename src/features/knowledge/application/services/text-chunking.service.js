export class TextChunkingService {
  constructor({ chunkSize = 1000, chunkOverlap = 200 } = {}) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  chunk(text) {
    if (!text?.trim()) {
      return [];
    }

    const normalizedText = text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();

    const chunks = [];

    let start = 0;
    let chunkIndex = 0;

    while (start < normalizedText.length) {
      let end = Math.min(start + this.chunkSize, normalizedText.length);

      if (end < normalizedText.length) {
        const paragraphBreak = normalizedText.lastIndexOf("\n", end);

        const sentenceBreak = normalizedText.lastIndexOf(". ", end);

        const wordBreak = normalizedText.lastIndexOf(" ", end);

        if (paragraphBreak > start + this.chunkSize * 0.6) {
          end = paragraphBreak;
        } else if (sentenceBreak > start + this.chunkSize * 0.6) {
          end = sentenceBreak + 1;
        } else if (wordBreak > start + this.chunkSize * 0.6) {
          end = wordBreak;
        }
      }

      const content = normalizedText.slice(start, end).trim();

      if (content) {
        chunks.push({
          content,
          chunkIndex,
        });

        chunkIndex += 1;
      }

      if (end >= normalizedText.length) {
        break;
      }

      start = Math.max(end - this.chunkOverlap, start + 1);
    }

    return chunks;
  }
}
