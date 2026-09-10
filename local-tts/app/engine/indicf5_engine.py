import logging
from typing import Dict, Tuple

import mlx.core as mx
import numpy as np
import soundfile as sf

from app.utils.text_normalizer import TextNormalizer


logger = logging.getLogger("indicf5.engine")

# Global reference audio conditioning tensor cache to avoid re-reading & re-embedding WAVs
_REFERENCE_CONDITIONING_CACHE: Dict[Tuple[str, str], Tuple[mx.array, int]] = {}


class IndicF5Engine:
    def __init__(
        self,
        model,
        reference_audio,
        reference_text,
        sample_rate=24000,
        group_size=1,
    ):
        self.model = model
        self.reference_audio = str(reference_audio)
        self.reference_text = str(reference_text).strip()
        self.sample_rate = sample_rate
        self.group_size = group_size

        cache_key = (self.reference_audio, self.reference_text)

        if cache_key in _REFERENCE_CONDITIONING_CACHE:
            self.reference_audio_mx, self.reference_samples = _REFERENCE_CONDITIONING_CACHE[cache_key]
            logger.info(f"Reusing cached reference audio embedding for '{self.reference_audio[:30]}'")
        else:
            audio_np, sr = sf.read(self.reference_audio)

            if sr != 24000:
                raise ValueError(
                    f"Reference audio must be 24 kHz, got {sr} Hz."
                )

            if audio_np.ndim != 1:
                raise ValueError(
                    "Reference audio must be mono."
                )

            reference_audio_np = audio_np.astype(np.float32)

            self.reference_audio_mx = mx.array(reference_audio_np)[None]
            mx.eval(self.reference_audio_mx)

            self.reference_samples = self.reference_audio_mx.shape[1]
            _REFERENCE_CONDITIONING_CACHE[cache_key] = (
                self.reference_audio_mx,
                self.reference_samples,
            )
            logger.info(f"Computed & cached new reference audio embedding for '{self.reference_audio[:30]}'")

        self.frames_per_sec = 24000 / 256  # 93.75 frames/sec

    def generate(
        self,
        text: str,
        steps: int,
        cfg_strength: float,
        sway_sampling_coef: float,
        target_rms: float,
        speed: float = 1.0,
    ) -> np.ndarray:

        text = text.strip()

        if not text:
            return np.zeros(
                0,
                dtype=np.float32,
            )

        # 1. Normalize text (Sentence language classification, Romanized Telugu mapping, technical acronyms, numbers)
        normalized_text, _ = TextNormalizer.normalize(text)

        logger.info(
            "Starting model generation | orig='%s' | norm='%s' | steps=%d | speed=%.2f",
            text[:30],
            normalized_text[:30],
            steps,
            speed,
        )

        ref_char_len = max(len(self.reference_text.strip()), 1)
        gen_char_len = max(len(normalized_text.strip()), 1)
        ref_frames = self.reference_samples // 256

        # Calculate optimal speech duration frames:
        # Clamped character speech rate (5.5 to 7.5 frames per character, ~13.5 chars/sec)
        raw_char_fps = ref_frames / ref_char_len
        clamped_char_fps = max(5.5, min(7.5, raw_char_fps))

        speed_factor = max(0.5, min(2.0, speed))
        gen_frames = int((clamped_char_fps * gen_char_len) / speed_factor) + 12
        duration_frames = ref_frames + gen_frames

        logger.info(
            "Estimated duration | total_frames=%d | ref_frames=%d | gen_frames=%d | speed=%.2f",
            duration_frames,
            ref_frames,
            gen_frames,
            speed_factor,
        )

        if duration_frames <= 0:
            raise RuntimeError(
                f"Invalid generation duration: {duration_frames} frames."
            )

        wave, _ = self.model.sample(
            cond=self.reference_audio_mx,
            text=[
                self.reference_text
                + " "
                + normalized_text
            ],
            duration=duration_frames,
            steps=steps,
            cfg_strength=cfg_strength,
            sway_sampling_coef=sway_sampling_coef,
        )

        mx.eval(wave)

        wave = wave[self.reference_samples:]

        mx.eval(wave)

        output = (
            np.array(wave)
            .reshape(-1)
            .astype(np.float32)
        )

        logger.info(
            "Model generation completed | samples=%d | duration=%.2fs",
            len(output),
            len(output) / self.sample_rate,
        )

        if output.size == 0:
            raise RuntimeError(
                "IndicF5 model returned empty audio."
            )

        rms = float(
            np.sqrt(
                np.mean(output**2)
            )
        )

        if rms > 1e-6:
            output = np.clip(
                output * (target_rms / rms),
                -1.0,
                1.0,
            )

        return output