import base64
import logging
import re
import tempfile
import time
import uuid
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Callable, Optional, Dict, Any, List

import numpy as np

from app.audio.audio_service import AudioService
from app.core.config import (
    OUTPUT_DIR,
    REFERENCE_AUDIO,
    REFERENCE_TEXT,
    TTSConfig,
    REFERENCE_TEXT_TELUGU,
)
from app.core.model import indicf5_model
from app.engine.indicf5_engine import IndicF5Engine
from app.utils.sentence_segmenter import SentenceSegmenter
from app.utils.prosody_planner import ProsodyPlanner, ProsodySegmentPlan
from app.utils.text_normalizer import TextNormalizer
from app.utils.language_span_detector import LanguageSpanDetector

import subprocess
import soundfile as sf

logger = logging.getLogger("indicf5.tts")

_CUSTOM_VOICE_ENGINES: Dict[str, IndicF5Engine] = {}


class TTSService:
    def __init__(self):
        self.model = indicf5_model
        self.audio_service = AudioService()
        self.generation_lock = Lock()

        self.reference_text = REFERENCE_TEXT_TELUGU

        self.engine = IndicF5Engine(
            model=self.model.model,
            reference_audio=str(REFERENCE_AUDIO),
            reference_text=self.reference_text,
            sample_rate=TTSConfig.SAMPLE_RATE,
            group_size=1,
        )

    def _convert_to_24k_mono_wav(self, input_path: str) -> str:
        """Converts input audio file (WAV, MP3, M4A, FLAC, OGG) to 24kHz mono WAV."""
        try:
            data, sr = sf.read(input_path)
            if data.ndim == 1 and sr == 24000:
                return input_path
        except Exception:
            pass

        out_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
        cmd = ["afconvert", "-f", "WAVE", "-d", "LEI16@24000", "-c", "1", str(input_path), out_wav]
        try:
            res = subprocess.run(cmd, capture_output=True)
            if res.returncode == 0:
                return out_wav
        except Exception:
            pass

        try:
            data, sr = sf.read(input_path)
            if data.ndim > 1:
                data = data.mean(axis=1)
            sf.write(out_wav, data, 24000, subtype="PCM_16")
            return out_wav
        except Exception as e:
            raise ValueError(f"Unable to decode or convert reference audio file: {e}")

    def calibrate_voice(
        self,
        reference_audio_base64: str,
        reference_text: str,
        custom_voice_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        reference_text = (reference_text or "").strip()
        if not reference_audio_base64:
            raise ValueError("Reference audio is required for voice cloning.")
        if not reference_text:
            raise ValueError("Reference transcript is required for voice cloning.")

        if not self.model.ready:
            raise RuntimeError("IndicF5 model is not ready.")

        voice_id = custom_voice_id or f"clone_{uuid.uuid4().hex[:12]}"

        audio_bytes = base64.b64decode(reference_audio_base64)
        tmp_in_path = None
        wav_path = None

        try:
            with tempfile.NamedTemporaryFile(suffix=".bin", delete=False) as tmp_in:
                tmp_in.write(audio_bytes)
                tmp_in_path = tmp_in.name

            wav_path = self._convert_to_24k_mono_wav(tmp_in_path)
            data, sr = sf.read(wav_path)
            duration_sec = len(data) / sr

            if duration_sec < 0.8:
                raise ValueError("Reference audio is too short (must be at least 1.0 second).")
            if duration_sec > 60.0:
                raise ValueError("Reference audio is too long (must be under 60 seconds).")

            calibrated_engine = IndicF5Engine(
                model=self.model.model,
                reference_audio=wav_path,
                reference_text=reference_text,
                sample_rate=TTSConfig.SAMPLE_RATE,
                group_size=1,
            )

            _CUSTOM_VOICE_ENGINES[voice_id] = calibrated_engine

            logger.info(
                f"[VOICE CLONE CALIBRATED] customVoiceId={voice_id} | duration={duration_sec:.2f}s | sr={sr}Hz"
            )

            return {
                "customVoiceId": voice_id,
                "status": "READY",
                "audioDurationSeconds": round(duration_sec, 2),
                "sampleRate": sr,
                "sampleCount": len(data),
            }
        finally:
            if tmp_in_path and Path(tmp_in_path).exists():
                try:
                    Path(tmp_in_path).unlink()
                except Exception:
                    pass

    def generate_speech(
        self,
        text: str,
        progress_callback: Optional[Callable[[int, int], None]] = None,
        voice_mode: str = "preset",
        preset_voice: Optional[str] = None,
        custom_voice_id: Optional[str] = None,
        reference_audio_base64: Optional[str] = None,
        reference_text: Optional[str] = None,
        speed: float = 1.0,
        speaking_style: str = "conversational",
        steps: Optional[int] = None,
        debug: bool = False,
    ) -> Dict[str, Any]:
        request_start = time.perf_counter()
        text = text.strip()

        if not text:
            raise ValueError("Text is required.")

        if len(text) > TTSConfig.MAX_TEXT_LENGTH:
            raise ValueError(
                f"Text exceeds the maximum length of "
                f"{TTSConfig.MAX_TEXT_LENGTH} characters."
            )

        if not self.model.ready:
            raise RuntimeError("IndicF5 model is not ready.")

        # Server-side validation and clamping of generation steps (4 to 12)
        raw_steps = steps if steps is not None else TTSConfig.GENERATION_STEPS
        generation_steps = max(4, min(12, int(raw_steps)))

        # 1. Measure Preprocessing & Normalization time
        t_pre_start = time.perf_counter()
        full_norm_text, span_debug_full = TextNormalizer.normalize(text)
        t_pre_ms = (time.perf_counter() - t_pre_start) * 1000.0

        # 2. Measure Reference Conditioning Setup time
        t_ref_start = time.perf_counter()
        target_engine = None

        if voice_mode == "custom_clone":
            if custom_voice_id and custom_voice_id in _CUSTOM_VOICE_ENGINES:
                target_engine = _CUSTOM_VOICE_ENGINES[custom_voice_id]
                logger.info(
                    f"[TTS REQUEST] voice_mode=custom_clone | customVoiceId={custom_voice_id} (Reusing cached voice embedding)"
                )
            elif reference_audio_base64 and reference_text:
                cal_res = self.calibrate_voice(
                    reference_audio_base64=reference_audio_base64,
                    reference_text=reference_text,
                    custom_voice_id=custom_voice_id,
                )
                custom_voice_id = cal_res["customVoiceId"]
                target_engine = _CUSTOM_VOICE_ENGINES[custom_voice_id]
                logger.info(
                    f"[TTS REQUEST] voice_mode=custom_clone | customVoiceId={custom_voice_id} (Calibrated on-the-fly)"
                )
            else:
                raise ValueError(
                    "Custom cloned voice is not ready. Please clone/calibrate the reference voice first."
                )
        else:
            target_engine = self.engine
            logger.info(
                f"[TTS REQUEST] voice_mode=preset | presetVoice={preset_voice or 'default'}"
            )

        t_ref_ms = (time.perf_counter() - t_ref_start) * 1000.0

        # 3. Measure Sentence Segmentation time
        t_seg_start = time.perf_counter()
        segments = SentenceSegmenter.segment(text)
        if not segments:
            raise ValueError("Unable to create TTS text segments.")
        t_seg_ms = (time.perf_counter() - t_seg_start) * 1000.0

        # 4. Measure Prosody Planning time
        t_plan_start = time.perf_counter()
        plans = ProsodyPlanner.create_plan(
            segments=segments,
            speed=speed,
            speaking_style=speaking_style,
        )
        t_plan_ms = (time.perf_counter() - t_plan_start) * 1000.0

        output_file = OUTPUT_DIR / f"{uuid.uuid4()}.wav"
        download_filename = f"tts-{datetime.now().strftime('%Y%m%d-%H%M%S')}.wav"
        total_segments = len(plans)

        generated_audio: List[np.ndarray] = []
        debug_telemetry: List[Dict[str, Any]] = []

        try:
            with self.generation_lock:
                for idx, plan in enumerate(plans, start=1):
                    seg_start = time.perf_counter()

                    norm_prompt, span_debug = TextNormalizer.normalize(plan.clean_prompt)
                    classification = LanguageSpanDetector.classify_sentence(plan.clean_prompt)

                    audio = target_engine.generate(
                        text=norm_prompt,
                        steps=generation_steps,
                        cfg_strength=TTSConfig.CFG_STRENGTH,
                        sway_sampling_coef=TTSConfig.SWAY_SAMPLING_COEF,
                        target_rms=TTSConfig.TARGET_RMS,
                        speed=speed,
                    )

                    audio = np.asarray(audio, dtype=np.float32)

                    if audio.size == 0:
                        raise RuntimeError(f"Empty audio generated for segment {idx}.")

                    generated_audio.append(audio)
                    seg_elapsed_sec = time.perf_counter() - seg_start

                    debug_telemetry.append({
                        "segmentIndex": idx,
                        "originalText": plan.segment_text,
                        "cleanPrompt": plan.clean_prompt,
                        "normalizedText": norm_prompt,
                        "sentenceLanguage": classification.language.value,
                        "confidence": classification.confidence,
                        "groupedSpans": classification.grouped_spans,
                        "detectedSpans": span_debug,
                        "boundaryType": plan.boundary_type.value,
                        "pauseDurationSec": plan.pause_duration_sec,
                        "generationTimeSec": round(seg_elapsed_sec, 3),
                        "charCount": len(norm_prompt),
                    })

                    if progress_callback:
                        progress_callback(idx, total_segments)

            # 5. Measure In-Memory Audio Stitching time
            t_stitch_start = time.perf_counter()
            final_audio = self.audio_service.merge(
                audio_chunks=generated_audio,
                plans=plans,
                target_rms=TTSConfig.TARGET_RMS,
            )
            t_stitch_ms = (time.perf_counter() - t_stitch_start) * 1000.0

            # 6. Measure WAV File Encoding & Disk Save time
            t_wav_start = time.perf_counter()
            self.audio_service.save(final_audio, output_file)
            t_wav_ms = (time.perf_counter() - t_wav_start) * 1000.0

            total_elapsed_sec = time.perf_counter() - request_start
            audio_duration_sec = len(final_audio) / TTSConfig.SAMPLE_RATE
            rtf = total_elapsed_sec / audio_duration_sec if audio_duration_sec > 0 else 0.0

            # Local development performance log
            profile_lines = [
                "==================================================",
                "TTS PERFORMANCE PROFILE",
                "--------------------------------------------------",
                f"Text Preprocessing  : {t_pre_ms:.1f}ms",
                f"Reference Embedding : {t_ref_ms:.1f}ms",
                f"Segmentation        : {t_seg_ms:.1f}ms",
                f"Prosody Planning    : {t_plan_ms:.1f}ms",
                f"Inference Calls     : {total_segments} call(s) at {generation_steps} steps",
            ]
            for seg_tel in debug_telemetry:
                profile_lines.append(
                    f"  - Sentence {seg_tel['segmentIndex']} ({seg_tel['sentenceLanguage']} | conf={seg_tel['confidence']:.2f}): {seg_tel['cleanPrompt']}"
                )
                if seg_tel["groupedSpans"]:
                    spans_str = " | ".join(f"{g['text']} → {g['language']} (conf={g['confidence']})" for g in seg_tel["groupedSpans"])
                    profile_lines.append(f"    Spans: {spans_str}")
            profile_lines.extend([
                f"Audio Stitching     : {t_stitch_ms:.1f}ms",
                f"WAV Encoding        : {t_wav_ms:.1f}ms",
                "--------------------------------------------------",
                f"TOTAL PIPELINE TIME : {total_elapsed_sec:.2f}s (Audio: {audio_duration_sec:.2f}s | RTF: {rtf:.3f})",
                "==================================================",
            ])
            logger.info("\n".join(profile_lines))

            res = {
                "path": output_file,
                "filename": download_filename,
                "totalGroups": total_segments,
                "audioDurationSeconds": round(audio_duration_sec, 3),
                "processingTimeSeconds": round(total_elapsed_sec, 3),
                "generationSteps": generation_steps,
            }

            if debug:
                res["telemetry"] = {
                    "originalText": text,
                    "normalizedText": full_norm_text,
                    "speakingStyle": speaking_style,
                    "speed": speed,
                    "generationSteps": generation_steps,
                    "totalSegments": total_segments,
                    "timing": {
                        "textPreprocessingMs": round(t_pre_ms, 1),
                        "referenceEmbeddingMs": round(t_ref_ms, 1),
                        "segmentationMs": round(t_seg_ms, 1),
                        "prosodyPlanningMs": round(t_plan_ms, 1),
                        "audioStitchingMs": round(t_stitch_ms, 1),
                        "wavEncodingMs": round(t_wav_ms, 1),
                        "totalPipelineSec": round(total_elapsed_sec, 3),
                        "rtf": round(rtf, 4),
                    },
                    "segments": debug_telemetry,
                }

            return res

        except Exception:
            if output_file.exists():
                output_file.unlink()

            logger.exception("TTS generation failed")
            raise


tts_service = TTSService()