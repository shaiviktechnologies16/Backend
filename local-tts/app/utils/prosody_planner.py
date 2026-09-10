from dataclasses import dataclass
from typing import List
from app.utils.sentence_segmenter import TextSegment, SegmentBoundary


@dataclass
class ProsodySegmentPlan:
    segment_text: str
    clean_prompt: str
    boundary_type: SegmentBoundary
    pause_duration_sec: float
    pitch_style: str = "conversational"


class ProsodyPlanner:
    @staticmethod
    def create_plan(
        segments: List[TextSegment],
        speed: float = 1.0,
        speaking_style: str = "conversational",
    ) -> List[ProsodySegmentPlan]:
        plans: List[ProsodySegmentPlan] = []
        speed_factor = 1.0 / max(0.5, min(2.0, speed))

        for idx, seg in enumerate(segments):
            is_last = idx == len(segments) - 1

            # Base pause calculations (in seconds)
            if seg.boundary_type == SegmentBoundary.COMMA:
                base_pause = 0.12  # ~120ms
            elif seg.boundary_type == SegmentBoundary.CLAUSE:
                base_pause = 0.20  # ~200ms
            elif seg.boundary_type == SegmentBoundary.QUESTION:
                base_pause = 0.40  # ~400ms
            elif seg.boundary_type == SegmentBoundary.EXCLAMATION:
                base_pause = 0.35  # ~350ms
            elif seg.boundary_type == SegmentBoundary.PARAGRAPH:
                base_pause = 0.60  # ~600ms
            else:  # STATEMENT
                base_pause = 0.30  # ~300ms

            # Adjust pause for sentence length
            char_len = len(seg.text)
            length_scale = 1.1 if char_len > 60 else (0.9 if char_len < 15 else 1.0)

            final_pause = round(base_pause * speed_factor * length_scale, 3)

            if is_last:
                final_pause = 0.05  # Slight trailing room for final chunk

            clean_prompt = seg.text.strip()
            # Clean prompt trailing punctuation for IndicF5 sampling while keeping tone intact
            clean_prompt = clean_prompt.rstrip(".!?,;")

            plans.append(ProsodySegmentPlan(
                segment_text=seg.text,
                clean_prompt=clean_prompt,
                boundary_type=seg.boundary_type,
                pause_duration_sec=final_pause,
                pitch_style=speaking_style,
            ))

        return plans

