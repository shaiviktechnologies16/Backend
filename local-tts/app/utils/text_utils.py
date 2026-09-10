import re


TELUGU_SENTENCE_ENDINGS = r"[.!?।॥]"


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def split_sentences(text: str) -> list[str]:
    text = normalize_text(text)

    if not text:
        return []

    sentences = re.split(
        rf"(?<={TELUGU_SENTENCE_ENDINGS})\s+",
        text,
    )

    return [
        sentence.strip()
        for sentence in sentences
        if sentence.strip()
    ]


def split_by_words(
    text: str,
    max_length: int,
) -> list[str]:
    words = text.split()

    if not words:
        return []

    chunks = []
    current = ""

    for word in words:
        candidate = (
            f"{current} {word}".strip()
            if current
            else word
        )

        if len(candidate) <= max_length:
            current = candidate
            continue

        if current:
            chunks.append(current)

        current = word

    if current:
        chunks.append(current)

    return chunks