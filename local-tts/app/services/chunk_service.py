import logging
import re

from app.core.config import TTSConfig
from app.utils.text_utils import (
    normalize_text,
    split_by_words,
    split_sentences,
)

logger = logging.getLogger("indicf5.chunk")


class ChunkService:
    def __init__(
        self,
        min_length: int = TTSConfig.MIN_CHUNK_LENGTH,
        max_length: int = TTSConfig.MAX_CHUNK_LENGTH,
    ):
        self.min_length = min_length
        self.max_length = max_length

    def create_chunks(self, text: str) -> list[str]:
        text = normalize_text(text)

        if not text:
            return []

        paragraphs = [
            paragraph.strip()
            for paragraph in re.split(r"\n+", text)
            if paragraph.strip()
        ]

        chunks = []

        for paragraph in paragraphs:
            sentences = split_sentences(paragraph)

            for sentence in sentences:
                chunks.extend(
                    self._split_sentence(sentence)
                )

        chunks = self._merge_small_chunks(chunks)

        logger.info(
            "Text chunked | characters=%d | chunks=%d",
            len(text),
            len(chunks),
        )

        for index, chunk in enumerate(chunks, start=1):
            logger.info(
                "Chunk %d/%d | characters=%d | text=%s",
                index,
                len(chunks),
                len(chunk),
                chunk,
            )

        return chunks

    def _split_sentence(
        self,
        sentence: str,
    ) -> list[str]:
        if len(sentence) <= self.max_length:
            return [sentence]

        clauses = re.split(
            r"(?<=[,;:…])\s+",
            sentence,
        )

        chunks = []
        current = ""

        for clause in clauses:
            clause = clause.strip()

            if not clause:
                continue

            candidate = (
                f"{current} {clause}".strip()
                if current
                else clause
            )

            if len(candidate) <= self.max_length:
                current = candidate
                continue

            if current:
                chunks.append(current)

            if len(clause) <= self.max_length:
                current = clause
            else:
                chunks.extend(
                    split_by_words(
                        clause,
                        self.max_length,
                    )
                )
                current = ""

        if current:
            chunks.append(current)

        return chunks

    def _merge_small_chunks(
        self,
        chunks: list[str],
    ) -> list[str]:
        if not chunks:
            return []

        result = []
        current = ""

        for chunk in chunks:
            if not current:
                current = chunk
                continue

            candidate = f"{current} {chunk}"

            if (
                len(current) < self.min_length
                and len(candidate) <= self.max_length
            ):
                current = candidate
            else:
                result.append(current)
                current = chunk

        if current:
            result.append(current)

        return result