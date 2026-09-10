import logging
from typing import List, Optional

import numpy as np
import soundfile as sf

from app.core.config import TTSConfig
from app.audio.audio_stitcher import AudioStitcher
from app.utils.prosody_planner import ProsodySegmentPlan
from app.utils.sentence_segmenter import SegmentBoundary

logger = logging.getLogger("indicf5.audio")


class AudioService:
    def __init__(
        self,
        sample_rate: int = TTSConfig.SAMPLE_RATE,
        pause_seconds: float = TTSConfig.CHUNK_PAUSE_SECONDS,
    ):
        self.sample_rate = sample_rate
        self.pause_seconds = pause_seconds
        self.stitcher = AudioStitcher(sample_rate=sample_rate)

    def add_pause(
        self,
        audio: np.ndarray,
    ) -> np.ndarray:
        pause_samples = int(self.sample_rate * self.pause_seconds)

        if pause_samples <= 0:
            return audio

        pause = np.zeros(pause_samples, dtype=np.float32)

        return np.concatenate([audio, pause])

    def merge(
        self,
        audio_chunks: List[np.ndarray],
        plans: Optional[List[ProsodySegmentPlan]] = None,
        target_rms: float = TTSConfig.TARGET_RMS,
    ) -> np.ndarray:
        if not audio_chunks:
            raise ValueError("No audio chunks provided.")

        if plans is None:
            # Fallback prosody plans for simple chunk merging
            plans = [
                ProsodySegmentPlan(
                    segment_text="",
                    clean_prompt="",
                    boundary_type=SegmentBoundary.STATEMENT,
                    pause_duration_sec=self.pause_seconds if idx < len(audio_chunks) - 1 else 0.05,
                )
                for idx in range(len(audio_chunks))
            ]

        return self.stitcher.stitch_segments(
            audio_chunks=audio_chunks,
            plans=plans,
            target_rms=target_rms,
        )

    def save(
        self,
        audio: np.ndarray,
        output_path,
    ) -> None:
        sf.write(
            str(output_path),
            audio,
            self.sample_rate,
            subtype="PCM_16",
        )

        logger.info(
            "Audio saved | path=%s | duration=%.2fs",
            output_path,
            len(audio) / self.sample_rate,
        )