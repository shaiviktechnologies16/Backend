import logging
from typing import List, Optional
import numpy as np

from app.utils.prosody_planner import ProsodySegmentPlan

logger = logging.getLogger("indicf5.stitcher")


class AudioStitcher:
    """
    Seamless audio boundary stitcher featuring:
    - Leading and trailing silence trimming from model outputs
    - Planned prosodic pause insertion
    - Linear boundary crossfading (15ms default) to eliminate pop/click artifacts
    - RMS loudness normalization & peak protection clipping
    """

    def __init__(self, sample_rate: int = 24000, crossfade_ms: float = 15.0):
        self.sample_rate = sample_rate
        self.crossfade_samples = max(1, int((crossfade_ms / 1000.0) * sample_rate))

    def trim_silence(self, audio: np.ndarray, threshold: float = 0.005) -> np.ndarray:
        """
        Trims leading and trailing silence where amplitude falls below threshold.
        """
        if audio.size == 0:
            return audio

        abs_audio = np.abs(audio)
        non_silent = np.where(abs_audio > threshold)[0]

        if len(non_silent) == 0:
            return audio

        start_idx = max(0, non_silent[0] - 100)
        end_idx = min(len(audio), non_silent[-1] + 100)

        return audio[start_idx:end_idx]

    def apply_fades(self, audio: np.ndarray, fade_in_samples: Optional[int] = None, fade_out_samples: Optional[int] = None) -> np.ndarray:
        """
        Applies smooth linear fade-in and fade-out to an audio segment.
        """
        if audio.size == 0:
            return audio

        out = audio.copy().astype(np.float32)
        fade_in_len = fade_in_samples if fade_in_samples is not None else self.crossfade_samples
        fade_out_len = fade_out_samples if fade_out_samples is not None else self.crossfade_samples

        fade_in_len = min(fade_in_len, len(out) // 2)
        fade_out_len = min(fade_out_len, len(out) // 2)

        if fade_in_len > 0:
            fade_in_curve = np.linspace(0.0, 1.0, fade_in_len, dtype=np.float32)
            out[:fade_in_len] *= fade_in_curve

        if fade_out_len > 0:
            fade_out_curve = np.linspace(1.0, 0.0, fade_out_len, dtype=np.float32)
            out[-fade_out_len:] *= fade_out_curve

        return out

    def stitch_segments(
        self,
        audio_chunks: List[np.ndarray],
        plans: List[ProsodySegmentPlan],
        target_rms: float = 0.1,
    ) -> np.ndarray:
        """
        Stitches segment audio chunks using prosody plans with silence trimming,
        planned pauses, boundary crossfades, and peak protection.
        """
        if not audio_chunks:
            raise ValueError("No audio chunks provided for stitching.")

        if len(audio_chunks) != len(plans):
            logger.warning(
                f"Mismatch between audio chunks ({len(audio_chunks)}) and prosody plans ({len(plans)}). Defaulting plan lengths."
            )

        processed_parts: List[np.ndarray] = []

        for idx, chunk in enumerate(audio_chunks):
            chunk = np.asarray(chunk, dtype=np.float32)
            plan = plans[idx] if idx < len(plans) else None

            # 1. Trim model-generated silence
            trimmed = self.trim_silence(chunk)
            if trimmed.size == 0:
                trimmed = chunk

            # 2. Apply boundary fades to prevent clicking
            faded = self.apply_fades(trimmed)
            processed_parts.append(faded)

            # 3. Add planned prosodic pause (if not the last segment)
            pause_sec = plan.pause_duration_sec if plan else 0.2
            if pause_sec > 0:
                pause_samples = int(pause_sec * self.sample_rate)
                silence = np.zeros(pause_samples, dtype=np.float32)
                processed_parts.append(silence)

        # Concatenate all parts
        full_audio = np.concatenate(processed_parts)

        # 4. Loudness Normalization & Peak Clipping Protection
        if full_audio.size > 0:
            rms = float(np.sqrt(np.mean(full_audio**2)))
            if rms > 1e-6 and target_rms > 0:
                full_audio = full_audio * (target_rms / rms)

            # Soft peak protection
            max_val = np.max(np.abs(full_audio))
            if max_val > 0.95:
                full_audio = np.clip(full_audio, -0.95, 0.95)

        logger.info(
            f"Stitching completed | total_duration={len(full_audio)/self.sample_rate:.2f}s | chunks={len(audio_chunks)}"
        )
        return full_audio

