import re
from dataclasses import dataclass
from enum import Enum
from typing import List


class SegmentBoundary(str, Enum):
    QUESTION = "QUESTION"
    EXCLAMATION = "EXCLAMATION"
    STATEMENT = "STATEMENT"
    COMMA = "COMMA"
    CLAUSE = "CLAUSE"
    PARAGRAPH = "PARAGRAPH"


@dataclass
class TextSegment:
    text: str
    boundary_type: SegmentBoundary
    ending_punctuation: str = "."
    internal_comma_count: int = 0


class SentenceSegmenter:
    """
    High-performance logical sentence segmenter.
    Punctuation like commas (,) do NOT create separate inference segments.
    Commas remain within the sentence string to guide natural model prosody.
    Only sentence-ending punctuation (. ! ? … । ॥ \\n) or unbreakably long text (> 250 chars)
    creates a segment boundary.
    Quotes and trailing non-speech emoji stay attached to their parent sentence.
    """

    MAX_SEGMENT_CHAR_LIMIT = 250

    @staticmethod
    def is_speakable(text: str) -> bool:
        """Returns True if text contains at least one speakable letter, digit, or Indic grapheme."""
        return bool(re.search(r"[\u0C00-\u0C7F0-9A-Za-z]", text))

    @staticmethod
    def segment(text: str, group_short_sentences: bool = True) -> List[TextSegment]:
        text = text.strip()
        if not text:
            return []

        # Strip non-speech emoji for clean sentence boundary splitting while preserving text
        clean_text = re.sub(r"[\u2600-\u27BF\U0001F300-\U0001F9FF\ufe0f]", "", text)

        # Mask safe dots in URLs, Emails, Decimals, Version numbers, Acronyms
        protected_text, masks = SentenceSegmenter._mask_protected_dots(clean_text)

        # Smart sentence regex pattern that keeps trailing quotes and brackets attached
        sentence_pattern = re.compile(r"([^.!?…।॥\n]+[.!?…।॥\n]+[\s”\"'’\)\]]*)")
        raw_chunks = [m.group(0).strip() for m in sentence_pattern.finditer(protected_text) if m.group(0).strip()]

        # If regex missed trailing text without sentence-ending punctuation
        if not raw_chunks:
            raw_chunks = [protected_text]

        segments: List[TextSegment] = []

        for chunk in raw_chunks:
            unmasked_chunk = SentenceSegmenter._unmask_protected_dots(chunk, masks).strip()

            # Skip un-speakable segments (e.g. orphan quotes, punctuation-only strings)
            if not SentenceSegmenter.is_speakable(unmasked_chunk):
                continue

            boundary_type = SegmentBoundary.STATEMENT
            ending_punc = "."

            if unmasked_chunk.endswith("?") or "?" in unmasked_chunk:
                boundary_type = SegmentBoundary.QUESTION
                ending_punc = "?"
            elif unmasked_chunk.endswith("!") or "!" in unmasked_chunk:
                boundary_type = SegmentBoundary.EXCLAMATION
                ending_punc = "!"
            elif unmasked_chunk.endswith("\n"):
                boundary_type = SegmentBoundary.PARAGRAPH
                ending_punc = "\n"

            comma_count = unmasked_chunk.count(",") + unmasked_chunk.count("،")

            # Split ONLY if sentence is excessively long (> 250 chars)
            if len(unmasked_chunk) > SentenceSegmenter.MAX_SEGMENT_CHAR_LIMIT and "," in unmasked_chunk:
                sub_parts = SentenceSegmenter._split_long_sentence(unmasked_chunk)
                for idx, part in enumerate(sub_parts):
                    if not SentenceSegmenter.is_speakable(part):
                        continue
                    is_last = idx == len(sub_parts) - 1
                    part_boundary = boundary_type if is_last else SegmentBoundary.CLAUSE
                    part_punc = ending_punc if is_last else ","
                    segments.append(TextSegment(
                        text=part,
                        boundary_type=part_boundary,
                        ending_punctuation=part_punc,
                        internal_comma_count=part.count(","),
                    ))
            else:
                segments.append(TextSegment(
                    text=unmasked_chunk,
                    boundary_type=boundary_type,
                    ending_punctuation=ending_punc,
                    internal_comma_count=comma_count,
                ))

        if not group_short_sentences:
            return segments

        # Group short consecutive segments to minimize redundant model inference calls
        return SentenceSegmenter._group_segments(segments)

    TARGET_GROUP_CHAR_LIMIT = 150

    @staticmethod
    def _group_segments(segments: List[TextSegment]) -> List[TextSegment]:
        if not segments:
            return []

        grouped_segments: List[TextSegment] = []
        current_texts: List[str] = []
        current_len = 0
        current_boundary = SegmentBoundary.STATEMENT
        current_punc = "."
        current_commas = 0

        for seg in segments:
            # Paragraph breaks or sentences exceeding target limit start a new group
            if current_texts and (
                current_len + len(seg.text) + 1 > SentenceSegmenter.TARGET_GROUP_CHAR_LIMIT
                or seg.ending_punctuation == "\n"
                or current_punc == "\n"
            ):
                combined_text = " ".join(current_texts)
                grouped_segments.append(TextSegment(
                    text=combined_text,
                    boundary_type=current_boundary,
                    ending_punctuation=current_punc,
                    internal_comma_count=current_commas,
                ))
                current_texts = [seg.text]
                current_len = len(seg.text)
                current_boundary = seg.boundary_type
                current_punc = seg.ending_punctuation
                current_commas = seg.internal_comma_count
            else:
                current_texts.append(seg.text)
                current_len += len(seg.text) + (1 if len(current_texts) > 1 else 0)
                current_commas += seg.internal_comma_count
                if seg.boundary_type in (SegmentBoundary.QUESTION, SegmentBoundary.EXCLAMATION):
                    current_boundary = seg.boundary_type
                    current_punc = seg.ending_punctuation
                elif current_boundary == SegmentBoundary.STATEMENT:
                    current_boundary = seg.boundary_type
                    current_punc = seg.ending_punctuation

        if current_texts:
            combined_text = " ".join(current_texts)
            grouped_segments.append(TextSegment(
                text=combined_text,
                boundary_type=current_boundary,
                ending_punctuation=current_punc,
                internal_comma_count=current_commas,
            ))

        return grouped_segments

    @staticmethod
    def _split_long_sentence(text: str) -> List[str]:
        parts = []
        raw_parts = [p.strip() for p in text.split(",") if p.strip()]
        current_part = ""

        for p in raw_parts:
            if not current_part:
                current_part = p
            elif len(current_part) + len(p) + 2 <= SentenceSegmenter.MAX_SEGMENT_CHAR_LIMIT:
                current_part += ", " + p
            else:
                parts.append(current_part + ",")
                current_part = p

        if current_part:
            parts.append(current_part)

        return parts if parts else [text]

    @staticmethod
    def _mask_protected_dots(text: str):
        masks = {}
        counter = 0

        # Protect Emails
        def mask_email(m):
            nonlocal counter
            key = f"__PROTECTED_EMAIL_{counter}__"
            counter += 1
            masks[key] = m.group(0)
            return key

        text = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", mask_email, text)

        # Protect URLs
        def mask_url(m):
            nonlocal counter
            key = f"__PROTECTED_URL_{counter}__"
            counter += 1
            masks[key] = m.group(0)
            return key

        text = re.sub(r"(https?://\S+|www\.\S+)", mask_url, text)

        # Protect Decimals, Version numbers, Acronyms (e.g. 3.14, v3.2, 8.5B)
        def mask_dec(m):
            nonlocal counter
            key = f"__PROTECTED_DEC_{counter}__"
            counter += 1
            masks[key] = m.group(0)
            return key

        text = re.sub(r"\b\d+\.\d+\b|\bv\d+\.\d+\b|\b[A-Za-z]\.[A-Za-z]\b", mask_dec, text)

        return text, masks

    @staticmethod
    def _unmask_protected_dots(text: str, masks: dict) -> str:
        for key, val in masks.items():
            text = text.replace(key, val)
        return text
